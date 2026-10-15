package core

import (
	"fmt"
	"sync"
	"time"

	"omniterminal/internal/models"

	"golang.org/x/crypto/ssh"
)

// PooledSSHClient 封装被连接池托管的底层 SSH 客户端
type PooledSSHClient struct {
	Key                string
	Host               string
	Port               int
	User               string
	Client             *ssh.Client
	RefCount           int
	Channels           map[string]int // "pty", "sftp", "telemetry", "tunnel", etc.
	MaxSessionsReached bool
	LastUsed           time.Time
	ActiveSince        time.Time
	IdleTimer          *time.Timer
	Mu                 sync.Mutex
}

// AddChannel 注册一个活动复用通道
func (p *PooledSSHClient) AddChannel(chType string) {
	p.Mu.Lock()
	defer p.Mu.Unlock()
	if p.Channels == nil {
		p.Channels = make(map[string]int)
	}
	p.Channels[chType]++
	p.LastUsed = time.Now()
}

// RemoveChannel 释放一个复用通道
func (p *PooledSSHClient) RemoveChannel(chType string) {
	p.Mu.Lock()
	defer p.Mu.Unlock()
	if p.Channels == nil {
		return
	}
	if p.Channels[chType] > 0 {
		p.Channels[chType]--
		if p.Channels[chType] == 0 {
			delete(p.Channels, chType)
		}
	}
	p.LastUsed = time.Now()
}

// GetTotalChannels 获取当前底层连接复用的总活跃通道数
func (p *PooledSSHClient) GetTotalChannels() int {
	p.Mu.Lock()
	defer p.Mu.Unlock()
	total := 0
	for _, count := range p.Channels {
		total += count
	}
	if total == 0 && p.RefCount > 0 {
		total = p.RefCount
	}
	return total
}

// GetChannelsBreakdown 获取通道分布副本
func (p *PooledSSHClient) GetChannelsBreakdown() map[string]int {
	p.Mu.Lock()
	defer p.Mu.Unlock()
	res := make(map[string]int)
	for k, v := range p.Channels {
		res[k] = v
	}
	if len(res) == 0 && p.RefCount > 0 {
		res["pty"] = p.RefCount
	}
	return res
}

// SSHConnectionPool 并发安全的 SSH 连接复用与智能连接池
type SSHConnectionPool struct {
	Mu          sync.RWMutex
	Pool        map[string]*PooledSSHClient
	MaxSize     int
	IdleTimeout time.Duration
}

// NewSSHConnectionPool 创建并初始化 SSH 连接池
func NewSSHConnectionPool(maxSize int, idleTimeout time.Duration) *SSHConnectionPool {
	if maxSize <= 0 {
		maxSize = 50
	}
	if idleTimeout <= 0 {
		idleTimeout = 300 * time.Second
	}
	return &SSHConnectionPool{
		Pool:        make(map[string]*PooledSSHClient),
		MaxSize:     maxSize,
		IdleTimeout: idleTimeout,
	}
}

// GetOrCreate 从池中获取已存在的连接或创建新连接
func (p *SSHConnectionPool) GetOrCreate(
	key string,
	host string,
	port int,
	user string,
	dialFunc func() (*ssh.Client, error),
) (*ssh.Client, bool, error) {
	p.Mu.Lock()
	if pooled, ok := p.Pool[key]; ok {
		pooled.Mu.Lock()
		// 校验底层连接健康状况
		if pooled.Client != nil && pooled.Client.Conn != nil {
			if pooled.IdleTimer != nil {
				pooled.IdleTimer.Stop()
				pooled.IdleTimer = nil
			}
			pooled.RefCount++
			pooled.LastUsed = time.Now()
			client := pooled.Client
			pooled.Mu.Unlock()
			p.Mu.Unlock()
			return client, true, nil
		}
		// 已经失效的连接，进行清理
		if pooled.Client != nil {
			_ = pooled.Client.Close()
		}
		delete(p.Pool, key)
		pooled.Mu.Unlock()
	}
	p.Mu.Unlock()

	// 连接池大小限制检查
	p.Mu.RLock()
	currentSize := len(p.Pool)
	p.Mu.RUnlock()
	if currentSize >= p.MaxSize {
		// 尝试回收已归零的闲置连接
		p.cleanupIdleClients()
	}

	// 执行实际拨号
	newClient, err := dialFunc()
	if err != nil {
		return nil, false, err
	}

	p.Mu.Lock()
	defer p.Mu.Unlock()

	pooled := &PooledSSHClient{
		Key:         key,
		Host:        host,
		Port:        port,
		User:        user,
		Client:      newClient,
		RefCount:    1,
		Channels:    make(map[string]int),
		LastUsed:    time.Now(),
		ActiveSince: time.Now(),
	}
	p.Pool[key] = pooled

	return newClient, false, nil
}

// Release 释放对池化连接的引用
func (p *SSHConnectionPool) Release(key string) {
	p.Mu.Lock()
	pooled, ok := p.Pool[key]
	p.Mu.Unlock()

	if !ok || pooled == nil {
		return
	}

	pooled.Mu.Lock()
	defer pooled.Mu.Unlock()

	if pooled.RefCount > 0 {
		pooled.RefCount--
	}
	pooled.LastUsed = time.Now()

	if pooled.RefCount == 0 {
		if pooled.IdleTimer != nil {
			pooled.IdleTimer.Stop()
		}
		// 启动空闲超时 Grace Period 释放定时器
		pooled.IdleTimer = time.AfterFunc(p.IdleTimeout, func() {
			p.evictIfIdle(key)
		})
	}
}

// evictIfIdle 若连接仍处于闲置状态，则从池中安全剔除并关闭连接
func (p *SSHConnectionPool) evictIfIdle(key string) {
	p.Mu.Lock()
	pooled, ok := p.Pool[key]
	if !ok || pooled == nil {
		p.Mu.Unlock()
		return
	}

	pooled.Mu.Lock()
	if pooled.RefCount == 0 {
		delete(p.Pool, key)
		pooled.Mu.Unlock()
		p.Mu.Unlock()
		if pooled.Client != nil {
			_ = pooled.Client.Close()
		}
		return
	}
	pooled.Mu.Unlock()
	p.Mu.Unlock()
}

// cleanupIdleClients 强制清理闲置连接以腾出容量
func (p *SSHConnectionPool) cleanupIdleClients() {
	p.Mu.Lock()
	defer p.Mu.Unlock()

	for k, pooled := range p.Pool {
		pooled.Mu.Lock()
		if pooled.RefCount == 0 {
			if pooled.IdleTimer != nil {
				pooled.IdleTimer.Stop()
			}
			delete(p.Pool, k)
			if pooled.Client != nil {
				_ = pooled.Client.Close()
			}
		}
		pooled.Mu.Unlock()
	}
}

// ClosePooled 手动立即关闭指定连接池连接
func (p *SSHConnectionPool) ClosePooled(key string) error {
	p.Mu.Lock()
	pooled, ok := p.Pool[key]
	if !ok {
		p.Mu.Unlock()
		return fmt.Errorf("连接 %s 不存在于连接池中", key)
	}
	delete(p.Pool, key)
	p.Mu.Unlock()

	pooled.Mu.Lock()
	if pooled.IdleTimer != nil {
		pooled.IdleTimer.Stop()
	}
	client := pooled.Client
	pooled.Mu.Unlock()

	if client != nil {
		return client.Close()
	}
	return nil
}

// AddChannel 为指定连接池连接增加活跃通道
func (p *SSHConnectionPool) AddChannel(key string, chType string) {
	p.Mu.RLock()
	pooled, ok := p.Pool[key]
	p.Mu.RUnlock()
	if ok && pooled != nil {
		pooled.AddChannel(chType)
	}
}

// RemoveChannel 为指定连接池连接移除活跃通道
func (p *SSHConnectionPool) RemoveChannel(key string, chType string) {
	p.Mu.RLock()
	pooled, ok := p.Pool[key]
	p.Mu.RUnlock()
	if ok && pooled != nil {
		pooled.RemoveChannel(chType)
	}
}

// GetPooledClient 获取指定池化客户端句柄
func (p *SSHConnectionPool) GetPooledClient(key string) *PooledSSHClient {
	p.Mu.RLock()
	defer p.Mu.RUnlock()
	return p.Pool[key]
}

// SetPooledClient 将已有连接注册进连接池
func (p *SSHConnectionPool) SetPooledClient(key, host string, port int, user string, client *ssh.Client) *PooledSSHClient {
	p.Mu.Lock()
	defer p.Mu.Unlock()
	pooled := &PooledSSHClient{
		Key:         key,
		Host:        host,
		Port:        port,
		User:        user,
		Client:      client,
		RefCount:    1,
		Channels:    make(map[string]int),
		LastUsed:    time.Now(),
		ActiveSince: time.Now(),
	}
	p.Pool[key] = pooled
	return pooled
}

// GetStats 获取当前连接池中所有连接的运行状态
func (p *SSHConnectionPool) GetStats() []models.SSHPoolStat {
	p.Mu.RLock()
	defer p.Mu.RUnlock()

	stats := make([]models.SSHPoolStat, 0, len(p.Pool))
	now := time.Now()

	for _, pooled := range p.Pool {
		pooled.Mu.Lock()
		idleSec := 0
		if pooled.RefCount == 0 {
			elapsed := int(now.Sub(pooled.LastUsed).Seconds())
			timeout := int(p.IdleTimeout.Seconds())
			idleSec = timeout - elapsed
			if idleSec < 0 {
				idleSec = 0
			}
		}
		totalChans := 0
		breakdown := make(map[string]int)
		for k, v := range pooled.Channels {
			breakdown[k] = v
			totalChans += v
		}
		if totalChans == 0 && pooled.RefCount > 0 {
			totalChans = pooled.RefCount
			breakdown["pty"] = pooled.RefCount
		}

		stats = append(stats, models.SSHPoolStat{
			Key:                 pooled.Key,
			Host:                pooled.Host,
			Port:                pooled.Port,
			User:                pooled.User,
			RefCount:            pooled.RefCount,
			ActiveChannelsCount: totalChans,
			ChannelsBreakdown:   breakdown,
			IdleSeconds:         idleSec,
			ActiveSince:         pooled.ActiveSince.Format("2006-01-02 15:04:05"),
			MaxSessionsReached:  pooled.MaxSessionsReached,
		})
		pooled.Mu.Unlock()
	}
	return stats
}

// CloseAll 关闭连接池中所有连接
func (p *SSHConnectionPool) CloseAll() {
	p.Mu.Lock()
	defer p.Mu.Unlock()

	for k, pooled := range p.Pool {
		pooled.Mu.Lock()
		if pooled.IdleTimer != nil {
			pooled.IdleTimer.Stop()
		}
		if pooled.Client != nil {
			_ = pooled.Client.Close()
		}
		pooled.Mu.Unlock()
		delete(p.Pool, k)
	}
}
