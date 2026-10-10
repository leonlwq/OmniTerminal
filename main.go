package main

import (
	"embed"
	"omniterminal/internal/app"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/mac"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	// Create an instance of the app structure
	appInstance := app.NewApp()

	// 尝试预读取记忆的窗口尺寸 (Stage 1)
	initWidth := 1280
	initHeight := 800
	if settings, err := appInstance.GetSettings(); err == nil && settings.RememberWindowPosition {
		if settings.WindowWidth > 300 && settings.WindowHeight > 200 {
			initWidth = settings.WindowWidth
			initHeight = settings.WindowHeight
		}
	}

	// Create application with options
	err := wails.Run(&options.App{
		Title:  "OmniTerminal",
		Width:  initWidth,
		Height: initHeight,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		BackgroundColour: &options.RGBA{R: 27, G: 38, B: 54, A: 0},
		Mac: &mac.Options{
			TitleBar:             mac.TitleBarHiddenInset(),
			Appearance:           mac.NSAppearanceNameDarkAqua,
			WindowIsTranslucent:  true,
			WebviewIsTransparent: true,
		},
		OnStartup:     appInstance.Startup,
		OnBeforeClose: appInstance.BeforeClose,
		SingleInstanceLock: &options.SingleInstanceLock{
			UniqueId: "com.omniterminal.app.instance",
			OnSecondInstanceLaunch: func(secondInstanceData options.SecondInstanceData) {
				if appInstance != nil {
					appInstance.ShowMainWindow()
					appInstance.HandleSecondInstanceLaunch(secondInstanceData.Args)
				}
			},
		},
		Bind: []interface{}{
			appInstance,
		},
	})

	if err != nil {
		println("Error:", err.Error())
	}
}
