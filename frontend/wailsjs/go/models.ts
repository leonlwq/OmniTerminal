export namespace app {
	
	export class KnownHostEntry {
	    index: number;
	    hostname: string;
	    keyType: string;
	    keyData: string;
	
	    static createFrom(source: any = {}) {
	        return new KnownHostEntry(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.index = source["index"];
	        this.hostname = source["hostname"];
	        this.keyType = source["keyType"];
	        this.keyData = source["keyData"];
	    }
	}
	export class SessionConfig {
	    id: string;
	    name: string;
	    isFolder: boolean;
	    parentId: string;
	    host: string;
	    port: number;
	    user: string;
	    password: string;
	    authProfileId: string;
	    identityKeyId: string;
	    privateKey: string;
	    certificate?: string;
	    useSshAgent?: boolean;
	    totpEntryId?: string;
	    loginScripts: models.ExpectInteractive[];
	    triggers: models.TriggerRule[];
	    overrideTheme: string;
	    overrideFontSize: number;
	    logConfig: models.LogConfig;
	    tunnels: models.SSHTunnel[];
	    encoding: string;
	    jumpHostSessionId: string;
	    overrideScrollback: number;
	    overrideCursorStyle: string;
	    overrideCursorBlink: number;
	    overrideEnableBell: number;
	    overrideCopyOnSelect: number;
	    overrideTerminalOpacity: number;
	    overrideLineHeight: number;
	    overrideTerminalPadding: number;
	    overrideEnableLigatures: number;
	    overrideCharSendDelayMs: number;
	    overrideLineSendDelayMs: number;
	    backgroundImage: string;
	    backgroundOpacity: number;
	    backgroundBlur: number;
	    backgroundFit: string;
	    colorLabel: string;
	    termType: string;
	    isLocal: boolean;
	    proxyType: string;
	    proxyHost: string;
	    proxyPort: number;
	    proxyUser: string;
	    proxyPassword: string;
	    ciphers: string[];
	    macs: string[];
	    sessionMode: string;
	    enableAgentForwarding: boolean;
	    enableX11Forwarding: boolean;
	    x11Display: string;
	    protocol: string;
	    serialConfig?: models.SerialConfig;
	    lineEnding?: string;
	    wslDistro?: string;
	    shellPath?: string;
	    moshServerPath?: string;
	    moshPortRange?: string;
	    moshPredictMode?: string;
	    webUrl?: string;
	    tags?: string[];
	    osc52Mode?: string;
	    containerType?: string;
	    dockerHostSessionId?: string;
	    dockerContainerId?: string;
	    dockerShell?: string;
	    k8sNamespace?: string;
	    k8sPod?: string;
	    k8sContainer?: string;
	    k8sKubeconfig?: string;
	
	    static createFrom(source: any = {}) {
	        return new SessionConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.isFolder = source["isFolder"];
	        this.parentId = source["parentId"];
	        this.host = source["host"];
	        this.port = source["port"];
	        this.user = source["user"];
	        this.password = source["password"];
	        this.authProfileId = source["authProfileId"];
	        this.identityKeyId = source["identityKeyId"];
	        this.privateKey = source["privateKey"];
	        this.certificate = source["certificate"];
	        this.useSshAgent = source["useSshAgent"];
	        this.totpEntryId = source["totpEntryId"];
	        this.loginScripts = this.convertValues(source["loginScripts"], models.ExpectInteractive);
	        this.triggers = this.convertValues(source["triggers"], models.TriggerRule);
	        this.overrideTheme = source["overrideTheme"];
	        this.overrideFontSize = source["overrideFontSize"];
	        this.logConfig = this.convertValues(source["logConfig"], models.LogConfig);
	        this.tunnels = this.convertValues(source["tunnels"], models.SSHTunnel);
	        this.encoding = source["encoding"];
	        this.jumpHostSessionId = source["jumpHostSessionId"];
	        this.overrideScrollback = source["overrideScrollback"];
	        this.overrideCursorStyle = source["overrideCursorStyle"];
	        this.overrideCursorBlink = source["overrideCursorBlink"];
	        this.overrideEnableBell = source["overrideEnableBell"];
	        this.overrideCopyOnSelect = source["overrideCopyOnSelect"];
	        this.overrideTerminalOpacity = source["overrideTerminalOpacity"];
	        this.overrideLineHeight = source["overrideLineHeight"];
	        this.overrideTerminalPadding = source["overrideTerminalPadding"];
	        this.overrideEnableLigatures = source["overrideEnableLigatures"];
	        this.overrideCharSendDelayMs = source["overrideCharSendDelayMs"];
	        this.overrideLineSendDelayMs = source["overrideLineSendDelayMs"];
	        this.backgroundImage = source["backgroundImage"];
	        this.backgroundOpacity = source["backgroundOpacity"];
	        this.backgroundBlur = source["backgroundBlur"];
	        this.backgroundFit = source["backgroundFit"];
	        this.colorLabel = source["colorLabel"];
	        this.termType = source["termType"];
	        this.isLocal = source["isLocal"];
	        this.proxyType = source["proxyType"];
	        this.proxyHost = source["proxyHost"];
	        this.proxyPort = source["proxyPort"];
	        this.proxyUser = source["proxyUser"];
	        this.proxyPassword = source["proxyPassword"];
	        this.ciphers = source["ciphers"];
	        this.macs = source["macs"];
	        this.sessionMode = source["sessionMode"];
	        this.enableAgentForwarding = source["enableAgentForwarding"];
	        this.enableX11Forwarding = source["enableX11Forwarding"];
	        this.x11Display = source["x11Display"];
	        this.protocol = source["protocol"];
	        this.serialConfig = this.convertValues(source["serialConfig"], models.SerialConfig);
	        this.lineEnding = source["lineEnding"];
	        this.wslDistro = source["wslDistro"];
	        this.shellPath = source["shellPath"];
	        this.moshServerPath = source["moshServerPath"];
	        this.moshPortRange = source["moshPortRange"];
	        this.moshPredictMode = source["moshPredictMode"];
	        this.webUrl = source["webUrl"];
	        this.tags = source["tags"];
	        this.osc52Mode = source["osc52Mode"];
	        this.containerType = source["containerType"];
	        this.dockerHostSessionId = source["dockerHostSessionId"];
	        this.dockerContainerId = source["dockerContainerId"];
	        this.dockerShell = source["dockerShell"];
	        this.k8sNamespace = source["k8sNamespace"];
	        this.k8sPod = source["k8sPod"];
	        this.k8sContainer = source["k8sContainer"];
	        this.k8sKubeconfig = source["k8sKubeconfig"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class SftpFileInfo {
	    name: string;
	    size: number;
	    isDir: boolean;
	    modTime: string;
	    mode: string;
	
	    static createFrom(source: any = {}) {
	        return new SftpFileInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.size = source["size"];
	        this.isDir = source["isDir"];
	        this.modTime = source["modTime"];
	        this.mode = source["mode"];
	    }
	}
	export class SftpResumeCheckResult {
	    exists: boolean;
	    srcSize: number;
	    dstSize: number;
	    canResume: boolean;
	    resumableBytes: number;
	    targetName: string;
	
	    static createFrom(source: any = {}) {
	        return new SftpResumeCheckResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.exists = source["exists"];
	        this.srcSize = source["srcSize"];
	        this.dstSize = source["dstSize"];
	        this.canResume = source["canResume"];
	        this.resumableBytes = source["resumableBytes"];
	        this.targetName = source["targetName"];
	    }
	}
	export class SyncSummary {
	    sessionsCount: number;
	    sessionsAdded: number;
	    sessionsUpdated: number;
	    sessionsPreserved: number;
	    authProfilesCount: number;
	    quickCmdSetsCount: number;
	    gistId?: string;
	    syncedAt: string;
	
	    static createFrom(source: any = {}) {
	        return new SyncSummary(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.sessionsCount = source["sessionsCount"];
	        this.sessionsAdded = source["sessionsAdded"];
	        this.sessionsUpdated = source["sessionsUpdated"];
	        this.sessionsPreserved = source["sessionsPreserved"];
	        this.authProfilesCount = source["authProfilesCount"];
	        this.quickCmdSetsCount = source["quickCmdSetsCount"];
	        this.gistId = source["gistId"];
	        this.syncedAt = source["syncedAt"];
	    }
	}
	export class ThemeConfig {
	    name: string;
	    background: string;
	    foreground: string;
	    cursor: string;
	    cursorAccent: string;
	    selection: string;
	    selectionForeground: string;
	    black: string;
	    red: string;
	    green: string;
	    yellow: string;
	    blue: string;
	    magenta: string;
	    cyan: string;
	    white: string;
	    brightBlack: string;
	    brightRed: string;
	    brightGreen: string;
	    brightYellow: string;
	    brightBlue: string;
	    brightMagenta: string;
	    brightCyan: string;
	    brightWhite: string;
	
	    static createFrom(source: any = {}) {
	        return new ThemeConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.background = source["background"];
	        this.foreground = source["foreground"];
	        this.cursor = source["cursor"];
	        this.cursorAccent = source["cursorAccent"];
	        this.selection = source["selection"];
	        this.selectionForeground = source["selectionForeground"];
	        this.black = source["black"];
	        this.red = source["red"];
	        this.green = source["green"];
	        this.yellow = source["yellow"];
	        this.blue = source["blue"];
	        this.magenta = source["magenta"];
	        this.cyan = source["cyan"];
	        this.white = source["white"];
	        this.brightBlack = source["brightBlack"];
	        this.brightRed = source["brightRed"];
	        this.brightGreen = source["brightGreen"];
	        this.brightYellow = source["brightYellow"];
	        this.brightBlue = source["brightBlue"];
	        this.brightMagenta = source["brightMagenta"];
	        this.brightCyan = source["brightCyan"];
	        this.brightWhite = source["brightWhite"];
	    }
	}
	export class ZmodemFile {
	    name: string;
	    size: number;
	    content: string;
	
	    static createFrom(source: any = {}) {
	        return new ZmodemFile(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.size = source["size"];
	        this.content = source["content"];
	    }
	}

}

export namespace core {
	
	export class SystemProxyInfo {
	    enabled: boolean;
	    proxyType: string;
	    host: string;
	    port: number;
	    source: string;
	    rawUrl: string;
	
	    static createFrom(source: any = {}) {
	        return new SystemProxyInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.enabled = source["enabled"];
	        this.proxyType = source["proxyType"];
	        this.host = source["host"];
	        this.port = source["port"];
	        this.source = source["source"];
	        this.rawUrl = source["rawUrl"];
	    }
	}

}

export namespace models {
	
	export class AIChatMessage {
	    role: string;
	    content: string;
	
	    static createFrom(source: any = {}) {
	        return new AIChatMessage(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.role = source["role"];
	        this.content = source["content"];
	    }
	}
	export class AIChatResponse {
	    command: string;
	    explanation: string;
	    riskLevel: string;
	    suggestions?: string[];
	    fullText: string;
	
	    static createFrom(source: any = {}) {
	        return new AIChatResponse(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.command = source["command"];
	        this.explanation = source["explanation"];
	        this.riskLevel = source["riskLevel"];
	        this.suggestions = source["suggestions"];
	        this.fullText = source["fullText"];
	    }
	}
	export class AIConfig {
	    provider: string;
	    apiKey: string;
	    baseUrl: string;
	    model: string;
	    temperature: number;
	    maxTokens: number;
	    systemPrompt: string;
	
	    static createFrom(source: any = {}) {
	        return new AIConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.provider = source["provider"];
	        this.apiKey = source["apiKey"];
	        this.baseUrl = source["baseUrl"];
	        this.model = source["model"];
	        this.temperature = source["temperature"];
	        this.maxTokens = source["maxTokens"];
	        this.systemPrompt = source["systemPrompt"];
	    }
	}
	export class MacroAction {
	    timeOffset: number;
	    data: string;
	
	    static createFrom(source: any = {}) {
	        return new MacroAction(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.timeOffset = source["timeOffset"];
	        this.data = source["data"];
	    }
	}
	export class AppMacro {
	    id: string;
	    name: string;
	    actions: MacroAction[];
	
	    static createFrom(source: any = {}) {
	        return new AppMacro(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.actions = this.convertValues(source["actions"], MacroAction);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class CloudSyncConfig {
	    provider: string;
	    serverUrl: string;
	    username: string;
	    password: string;
	    remotePath: string;
	    gistToken?: string;
	    gistId?: string;
	    autoSyncOnStartup: boolean;
	    s3Bucket?: string;
	    s3Region?: string;
	    s3AccessKey?: string;
	    s3SecretKey?: string;
	    autoSyncIntervalMinutes: number;
	    lastSyncTime: string;
	
	    static createFrom(source: any = {}) {
	        return new CloudSyncConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.provider = source["provider"];
	        this.serverUrl = source["serverUrl"];
	        this.username = source["username"];
	        this.password = source["password"];
	        this.remotePath = source["remotePath"];
	        this.gistToken = source["gistToken"];
	        this.gistId = source["gistId"];
	        this.autoSyncOnStartup = source["autoSyncOnStartup"];
	        this.s3Bucket = source["s3Bucket"];
	        this.s3Region = source["s3Region"];
	        this.s3AccessKey = source["s3AccessKey"];
	        this.s3SecretKey = source["s3SecretKey"];
	        this.autoSyncIntervalMinutes = source["autoSyncIntervalMinutes"];
	        this.lastSyncTime = source["lastSyncTime"];
	    }
	}
	export class DangerousCommandRule {
	    pattern: string;
	    desc: string;
	    enabled: boolean;
	
	    static createFrom(source: any = {}) {
	        return new DangerousCommandRule(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.pattern = source["pattern"];
	        this.desc = source["desc"];
	        this.enabled = source["enabled"];
	    }
	}
	export class KeyMapping {
	    keyCombo: string;
	    action: string;
	    actionData: string;
	
	    static createFrom(source: any = {}) {
	        return new KeyMapping(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.keyCombo = source["keyCombo"];
	        this.action = source["action"];
	        this.actionData = source["actionData"];
	    }
	}
	export class HighlightRule {
	    id?: string;
	    name?: string;
	    pattern: string;
	    color: string;
	    bgColor?: string;
	    category?: string;
	    enabled: boolean;
	    ignoreCase: boolean;
	    showInRuler: boolean;
	
	    static createFrom(source: any = {}) {
	        return new HighlightRule(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.pattern = source["pattern"];
	        this.color = source["color"];
	        this.bgColor = source["bgColor"];
	        this.category = source["category"];
	        this.enabled = source["enabled"];
	        this.ignoreCase = source["ignoreCase"];
	        this.showInRuler = source["showInRuler"];
	    }
	}
	export class StatusBarConfig {
	    showConnectionState: boolean;
	    showUptime: boolean;
	    showTerminalSize: boolean;
	    showProtocol: boolean;
	    showEncoding: boolean;
	    showSessionType: boolean;
	    showTraffic: boolean;
	
	    static createFrom(source: any = {}) {
	        return new StatusBarConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.showConnectionState = source["showConnectionState"];
	        this.showUptime = source["showUptime"];
	        this.showTerminalSize = source["showTerminalSize"];
	        this.showProtocol = source["showProtocol"];
	        this.showEncoding = source["showEncoding"];
	        this.showSessionType = source["showSessionType"];
	        this.showTraffic = source["showTraffic"];
	    }
	}
	export class QuickCommand {
	    label: string;
	    cmd: string;
	
	    static createFrom(source: any = {}) {
	        return new QuickCommand(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.label = source["label"];
	        this.cmd = source["cmd"];
	    }
	}
	export class QuickCommandSet {
	    id: string;
	    parentId: string;
	    isFolder: boolean;
	    setName: string;
	    commands: QuickCommand[];
	
	    static createFrom(source: any = {}) {
	        return new QuickCommandSet(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.parentId = source["parentId"];
	        this.isFolder = source["isFolder"];
	        this.setName = source["setName"];
	        this.commands = this.convertValues(source["commands"], QuickCommand);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class CustomThemeConfig {
	    name: string;
	    background: string;
	    foreground: string;
	    cursor: string;
	    cursorAccent?: string;
	    selectionBackground?: string;
	    selectionForeground?: string;
	    black: string;
	    red: string;
	    green: string;
	    yellow: string;
	    blue: string;
	    magenta: string;
	    cyan: string;
	    white: string;
	    brightBlack: string;
	    brightRed: string;
	    brightGreen: string;
	    brightYellow: string;
	    brightBlue: string;
	    brightMagenta: string;
	    brightCyan: string;
	    brightWhite: string;
	
	    static createFrom(source: any = {}) {
	        return new CustomThemeConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.background = source["background"];
	        this.foreground = source["foreground"];
	        this.cursor = source["cursor"];
	        this.cursorAccent = source["cursorAccent"];
	        this.selectionBackground = source["selectionBackground"];
	        this.selectionForeground = source["selectionForeground"];
	        this.black = source["black"];
	        this.red = source["red"];
	        this.green = source["green"];
	        this.yellow = source["yellow"];
	        this.blue = source["blue"];
	        this.magenta = source["magenta"];
	        this.cyan = source["cyan"];
	        this.white = source["white"];
	        this.brightBlack = source["brightBlack"];
	        this.brightRed = source["brightRed"];
	        this.brightGreen = source["brightGreen"];
	        this.brightYellow = source["brightYellow"];
	        this.brightBlue = source["brightBlue"];
	        this.brightMagenta = source["brightMagenta"];
	        this.brightCyan = source["brightCyan"];
	        this.brightWhite = source["brightWhite"];
	    }
	}
	export class AppSettings {
	    themeName: string;
	    language: string;
	    customThemes: CustomThemeConfig[];
	    fontFamily: string;
	    nonAsciiFontFamily: string;
	    fontSize: number;
	    enableLigatures: boolean;
	    hasMasterPassword: boolean;
	    masterPasswordSalt: string;
	    validationBlock: string;
	    quickCommandSets: QuickCommandSet[];
	    activeCommandSetID: string;
	    macros: AppMacro[];
	    statusBarConfig: StatusBarConfig;
	    favoriteSessionIds: string[];
	    scrollbackLines: number;
	    copyOnSelect: boolean;
	    cursorStyle: string;
	    cursorBlink: boolean;
	    enableBell: boolean;
	    terminalOpacity: number;
	    windowOpacity: number;
	    enableBlur: boolean;
	    lineHeight: number;
	    terminalPadding: number;
	    backgroundBlur: number;
	    backgroundFit: string;
	    autoLockTimeoutMinutes: number;
	    fontWeight: string;
	    fontWeightBold: string;
	    letterSpacing: number;
	    minimumContrastRatio: number;
	    globalBackgroundImage: string;
	    globalBackgroundOpacity: number;
	    globalBackgroundBlur: number;
	    globalBackgroundFit: string;
	    customGlyphs: boolean;
	    unicodeVersion: string;
	    drawBoldTextInBrightColors: boolean;
	    cursorColor: string;
	    cursorAccentColor: string;
	    selectionBackground: string;
	    selectionForeground: string;
	    rendererType: string;
	    fontSmoothing: string;
	    enableTerminalImages: boolean;
	    imageStorageLimitMB: number;
	    enableHighlightRules: boolean;
	    highlightRules: HighlightRule[];
	    keyMappings: KeyMapping[];
	    rightClickAction: string;
	    doubleClickAction: string;
	    enableSafePaste: boolean;
	    enableDangerousGuard: boolean;
	    dangerousRules: DangerousCommandRule[];
	    useAltAsMeta: boolean;
	    wordSeparators: string;
	    openLinksOnClick: boolean;
	    defaultSessionTemplate: Record<string, any>;
	    charSendDelayMs: number;
	    lineSendDelayMs: number;
	    externalEditorPath: string;
	    autoRestoreWorkspace: boolean;
	    fileConflictStrategy: string;
	    minimizeToTrayOnClose: boolean;
	    enableQuakeMode: boolean;
	    quakeHotkey: string;
	    quakeHeightPercent: number;
	    rememberWindowPosition: boolean;
	    windowWidth: number;
	    windowHeight: number;
	    windowX: number;
	    windowY: number;
	    windowIsMaximised: boolean;
	    closeAction: string;
	    closeDoNotAskAgain: boolean;
	    confirmCloseConnectedTab: boolean;
	    confirmCloseAnyTab: boolean;
	    preventSleep: boolean;
	    useSystemProxy: boolean;
	    autoStartAtBoot: boolean;
	    disableSystemTray: boolean;
	    aiConfig: AIConfig;
	    cloudSyncConfig: CloudSyncConfig;
	    appThemeMode: string;
	    dockLayout: string;
	    dockPanels: Record<string, string>;
	    showCommandDuration: boolean;
	    highlightHyperlinks: boolean;
	    osc52Mode: string;
	    osc52MaxBytes: number;
	    osc52ShowToast: boolean;
	    enableSshConnectionPool: boolean;
	    sshPoolIdleTimeoutSec: number;
	    sshPoolMaxSize: number;
	    customKeybindings: Record<string, string>;
	    enableStructuredOutput: boolean;
	    commandBlockMode: string;
	    quakeAnimationDurationMs: number;
	    quakeAutoCommand: string;
	    monacoFontSize: number;
	    monacoTabSize: number;
	    monacoWordWrap: boolean;
	    enableMiniTelemetry: boolean;
	    miniTelemetryIntervalSec: number;
	
	    static createFrom(source: any = {}) {
	        return new AppSettings(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.themeName = source["themeName"];
	        this.language = source["language"];
	        this.customThemes = this.convertValues(source["customThemes"], CustomThemeConfig);
	        this.fontFamily = source["fontFamily"];
	        this.nonAsciiFontFamily = source["nonAsciiFontFamily"];
	        this.fontSize = source["fontSize"];
	        this.enableLigatures = source["enableLigatures"];
	        this.hasMasterPassword = source["hasMasterPassword"];
	        this.masterPasswordSalt = source["masterPasswordSalt"];
	        this.validationBlock = source["validationBlock"];
	        this.quickCommandSets = this.convertValues(source["quickCommandSets"], QuickCommandSet);
	        this.activeCommandSetID = source["activeCommandSetID"];
	        this.macros = this.convertValues(source["macros"], AppMacro);
	        this.statusBarConfig = this.convertValues(source["statusBarConfig"], StatusBarConfig);
	        this.favoriteSessionIds = source["favoriteSessionIds"];
	        this.scrollbackLines = source["scrollbackLines"];
	        this.copyOnSelect = source["copyOnSelect"];
	        this.cursorStyle = source["cursorStyle"];
	        this.cursorBlink = source["cursorBlink"];
	        this.enableBell = source["enableBell"];
	        this.terminalOpacity = source["terminalOpacity"];
	        this.windowOpacity = source["windowOpacity"];
	        this.enableBlur = source["enableBlur"];
	        this.lineHeight = source["lineHeight"];
	        this.terminalPadding = source["terminalPadding"];
	        this.backgroundBlur = source["backgroundBlur"];
	        this.backgroundFit = source["backgroundFit"];
	        this.autoLockTimeoutMinutes = source["autoLockTimeoutMinutes"];
	        this.fontWeight = source["fontWeight"];
	        this.fontWeightBold = source["fontWeightBold"];
	        this.letterSpacing = source["letterSpacing"];
	        this.minimumContrastRatio = source["minimumContrastRatio"];
	        this.globalBackgroundImage = source["globalBackgroundImage"];
	        this.globalBackgroundOpacity = source["globalBackgroundOpacity"];
	        this.globalBackgroundBlur = source["globalBackgroundBlur"];
	        this.globalBackgroundFit = source["globalBackgroundFit"];
	        this.customGlyphs = source["customGlyphs"];
	        this.unicodeVersion = source["unicodeVersion"];
	        this.drawBoldTextInBrightColors = source["drawBoldTextInBrightColors"];
	        this.cursorColor = source["cursorColor"];
	        this.cursorAccentColor = source["cursorAccentColor"];
	        this.selectionBackground = source["selectionBackground"];
	        this.selectionForeground = source["selectionForeground"];
	        this.rendererType = source["rendererType"];
	        this.fontSmoothing = source["fontSmoothing"];
	        this.enableTerminalImages = source["enableTerminalImages"];
	        this.imageStorageLimitMB = source["imageStorageLimitMB"];
	        this.enableHighlightRules = source["enableHighlightRules"];
	        this.highlightRules = this.convertValues(source["highlightRules"], HighlightRule);
	        this.keyMappings = this.convertValues(source["keyMappings"], KeyMapping);
	        this.rightClickAction = source["rightClickAction"];
	        this.doubleClickAction = source["doubleClickAction"];
	        this.enableSafePaste = source["enableSafePaste"];
	        this.enableDangerousGuard = source["enableDangerousGuard"];
	        this.dangerousRules = this.convertValues(source["dangerousRules"], DangerousCommandRule);
	        this.useAltAsMeta = source["useAltAsMeta"];
	        this.wordSeparators = source["wordSeparators"];
	        this.openLinksOnClick = source["openLinksOnClick"];
	        this.defaultSessionTemplate = source["defaultSessionTemplate"];
	        this.charSendDelayMs = source["charSendDelayMs"];
	        this.lineSendDelayMs = source["lineSendDelayMs"];
	        this.externalEditorPath = source["externalEditorPath"];
	        this.autoRestoreWorkspace = source["autoRestoreWorkspace"];
	        this.fileConflictStrategy = source["fileConflictStrategy"];
	        this.minimizeToTrayOnClose = source["minimizeToTrayOnClose"];
	        this.enableQuakeMode = source["enableQuakeMode"];
	        this.quakeHotkey = source["quakeHotkey"];
	        this.quakeHeightPercent = source["quakeHeightPercent"];
	        this.rememberWindowPosition = source["rememberWindowPosition"];
	        this.windowWidth = source["windowWidth"];
	        this.windowHeight = source["windowHeight"];
	        this.windowX = source["windowX"];
	        this.windowY = source["windowY"];
	        this.windowIsMaximised = source["windowIsMaximised"];
	        this.closeAction = source["closeAction"];
	        this.closeDoNotAskAgain = source["closeDoNotAskAgain"];
	        this.confirmCloseConnectedTab = source["confirmCloseConnectedTab"];
	        this.confirmCloseAnyTab = source["confirmCloseAnyTab"];
	        this.preventSleep = source["preventSleep"];
	        this.useSystemProxy = source["useSystemProxy"];
	        this.autoStartAtBoot = source["autoStartAtBoot"];
	        this.disableSystemTray = source["disableSystemTray"];
	        this.aiConfig = this.convertValues(source["aiConfig"], AIConfig);
	        this.cloudSyncConfig = this.convertValues(source["cloudSyncConfig"], CloudSyncConfig);
	        this.appThemeMode = source["appThemeMode"];
	        this.dockLayout = source["dockLayout"];
	        this.dockPanels = source["dockPanels"];
	        this.showCommandDuration = source["showCommandDuration"];
	        this.highlightHyperlinks = source["highlightHyperlinks"];
	        this.osc52Mode = source["osc52Mode"];
	        this.osc52MaxBytes = source["osc52MaxBytes"];
	        this.osc52ShowToast = source["osc52ShowToast"];
	        this.enableSshConnectionPool = source["enableSshConnectionPool"];
	        this.sshPoolIdleTimeoutSec = source["sshPoolIdleTimeoutSec"];
	        this.sshPoolMaxSize = source["sshPoolMaxSize"];
	        this.customKeybindings = source["customKeybindings"];
	        this.enableStructuredOutput = source["enableStructuredOutput"];
	        this.commandBlockMode = source["commandBlockMode"];
	        this.quakeAnimationDurationMs = source["quakeAnimationDurationMs"];
	        this.quakeAutoCommand = source["quakeAutoCommand"];
	        this.monacoFontSize = source["monacoFontSize"];
	        this.monacoTabSize = source["monacoTabSize"];
	        this.monacoWordWrap = source["monacoWordWrap"];
	        this.enableMiniTelemetry = source["enableMiniTelemetry"];
	        this.miniTelemetryIntervalSec = source["miniTelemetryIntervalSec"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class AuthProfile {
	    id: string;
	    name: string;
	    user: string;
	    password: string;
	    privateKey: string;
	
	    static createFrom(source: any = {}) {
	        return new AuthProfile(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.user = source["user"];
	        this.password = source["password"];
	        this.privateKey = source["privateKey"];
	    }
	}
	
	export class CommandHistoryEntry {
	    id: string;
	    sessionId: string;
	    sessionName: string;
	    host: string;
	    command: string;
	    exitCode: number;
	    timestamp: string;
	
	    static createFrom(source: any = {}) {
	        return new CommandHistoryEntry(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.sessionId = source["sessionId"];
	        this.sessionName = source["sessionName"];
	        this.host = source["host"];
	        this.command = source["command"];
	        this.exitCode = source["exitCode"];
	        this.timestamp = source["timestamp"];
	    }
	}
	export class ContainerFileInfo {
	    name: string;
	    path: string;
	    size: number;
	    mode: string;
	    modTime: string;
	    isDir: boolean;
	    isSymlink: boolean;
	    linkTarget?: string;
	
	    static createFrom(source: any = {}) {
	        return new ContainerFileInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.path = source["path"];
	        this.size = source["size"];
	        this.mode = source["mode"];
	        this.modTime = source["modTime"];
	        this.isDir = source["isDir"];
	        this.isSymlink = source["isSymlink"];
	        this.linkTarget = source["linkTarget"];
	    }
	}
	export class ContainerInfo {
	    id: string;
	    names: string;
	    image: string;
	    command: string;
	    createdAt: string;
	    status: string;
	    state: string;
	    ports: string;
	
	    static createFrom(source: any = {}) {
	        return new ContainerInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.names = source["names"];
	        this.image = source["image"];
	        this.command = source["command"];
	        this.createdAt = source["createdAt"];
	        this.status = source["status"];
	        this.state = source["state"];
	        this.ports = source["ports"];
	    }
	}
	
	
	export class DirDiffItem {
	    relativePath: string;
	    name: string;
	    isDir: boolean;
	    status: string;
	    localSize: number;
	    remoteSize: number;
	    localModTime: string;
	    remoteModTime: string;
	
	    static createFrom(source: any = {}) {
	        return new DirDiffItem(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.relativePath = source["relativePath"];
	        this.name = source["name"];
	        this.isDir = source["isDir"];
	        this.status = source["status"];
	        this.localSize = source["localSize"];
	        this.remoteSize = source["remoteSize"];
	        this.localModTime = source["localModTime"];
	        this.remoteModTime = source["remoteModTime"];
	    }
	}
	export class DirDiffResult {
	    totalFiles: number;
	    diffCount: number;
	    items: DirDiffItem[];
	
	    static createFrom(source: any = {}) {
	        return new DirDiffResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.totalFiles = source["totalFiles"];
	        this.diffCount = source["diffCount"];
	        this.items = this.convertValues(source["items"], DirDiffItem);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class ExpectInteractive {
	    expect: string;
	    send: string;
	
	    static createFrom(source: any = {}) {
	        return new ExpectInteractive(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.expect = source["expect"];
	        this.send = source["send"];
	    }
	}
	export class GitDiffResult {
	    original: string;
	    modified: string;
	    diffText: string;
	    path: string;
	
	    static createFrom(source: any = {}) {
	        return new GitDiffResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.original = source["original"];
	        this.modified = source["modified"];
	        this.diffText = source["diffText"];
	        this.path = source["path"];
	    }
	}
	export class GitFileStatus {
	    path: string;
	    status: string;
	    staged: boolean;
	    untracked: boolean;
	
	    static createFrom(source: any = {}) {
	        return new GitFileStatus(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.path = source["path"];
	        this.status = source["status"];
	        this.staged = source["staged"];
	        this.untracked = source["untracked"];
	    }
	}
	
	export class HopDiagnosisDetail {
	    hopIndex: number;
	    name: string;
	    fromAddr: string;
	    toAddr: string;
	    rttMs: number;
	    status: string;
	    errorDetail?: string;
	
	    static createFrom(source: any = {}) {
	        return new HopDiagnosisDetail(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.hopIndex = source["hopIndex"];
	        this.name = source["name"];
	        this.fromAddr = source["fromAddr"];
	        this.toAddr = source["toAddr"];
	        this.rttMs = source["rttMs"];
	        this.status = source["status"];
	        this.errorDetail = source["errorDetail"];
	    }
	}
	export class HostResourceMetrics {
	    sessionId: string;
	    cpuUsage: number;
	    memUsage: number;
	    memTotalMB: number;
	    memUsedMB: number;
	    diskUsage: number;
	    diskTotalGB: number;
	    diskUsedGB: number;
	    netRxRateKBps: number;
	    netTxRateKBps: number;
	    uptimeStr: string;
	    sampledAt: string;
	    error?: string;
	
	    static createFrom(source: any = {}) {
	        return new HostResourceMetrics(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.sessionId = source["sessionId"];
	        this.cpuUsage = source["cpuUsage"];
	        this.memUsage = source["memUsage"];
	        this.memTotalMB = source["memTotalMB"];
	        this.memUsedMB = source["memUsedMB"];
	        this.diskUsage = source["diskUsage"];
	        this.diskTotalGB = source["diskTotalGB"];
	        this.diskUsedGB = source["diskUsedGB"];
	        this.netRxRateKBps = source["netRxRateKBps"];
	        this.netTxRateKBps = source["netTxRateKBps"];
	        this.uptimeStr = source["uptimeStr"];
	        this.sampledAt = source["sampledAt"];
	        this.error = source["error"];
	    }
	}
	export class HostStatusResult {
	    sessionId: string;
	    online: boolean;
	    latencyMs: number;
	    checkedAt: string;
	    error: string;
	
	    static createFrom(source: any = {}) {
	        return new HostStatusResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.sessionId = source["sessionId"];
	        this.online = source["online"];
	        this.latencyMs = source["latencyMs"];
	        this.checkedAt = source["checkedAt"];
	        this.error = source["error"];
	    }
	}
	export class IdentityKey {
	    id: string;
	    name: string;
	    privateKey: string;
	    publicKey: string;
	
	    static createFrom(source: any = {}) {
	        return new IdentityKey(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.privateKey = source["privateKey"];
	        this.publicKey = source["publicKey"];
	    }
	}
	export class InspectionCheck {
	    id: string;
	    category: string;
	    name: string;
	    command: string;
	    description: string;
	    timeoutSec: number;
	    enabled: boolean;
	
	    static createFrom(source: any = {}) {
	        return new InspectionCheck(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.category = source["category"];
	        this.name = source["name"];
	        this.command = source["command"];
	        this.description = source["description"];
	        this.timeoutSec = source["timeoutSec"];
	        this.enabled = source["enabled"];
	    }
	}
	export class InspectionItemResult {
	    checkId: string;
	    name: string;
	    category: string;
	    command: string;
	    output: string;
	    exitCode: number;
	    durationMs: number;
	    hasIssue: boolean;
	    issueDetail?: string;
	
	    static createFrom(source: any = {}) {
	        return new InspectionItemResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.checkId = source["checkId"];
	        this.name = source["name"];
	        this.category = source["category"];
	        this.command = source["command"];
	        this.output = source["output"];
	        this.exitCode = source["exitCode"];
	        this.durationMs = source["durationMs"];
	        this.hasIssue = source["hasIssue"];
	        this.issueDetail = source["issueDetail"];
	    }
	}
	export class InspectionHostResult {
	    sessionId: string;
	    hostName: string;
	    hostIp: string;
	    status: string;
	    executionMs: number;
	    checkItems: Record<string, InspectionItemResult>;
	    issueCount: number;
	    error?: string;
	
	    static createFrom(source: any = {}) {
	        return new InspectionHostResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.sessionId = source["sessionId"];
	        this.hostName = source["hostName"];
	        this.hostIp = source["hostIp"];
	        this.status = source["status"];
	        this.executionMs = source["executionMs"];
	        this.checkItems = this.convertValues(source["checkItems"], InspectionItemResult, true);
	        this.issueCount = source["issueCount"];
	        this.error = source["error"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	export class InspectionReport {
	    id: string;
	    title: string;
	    createdAt: number;
	    hostCount: number;
	    issueCount: number;
	    durationMs: number;
	    hostResults: Record<string, InspectionHostResult>;
	    summary: string;
	
	    static createFrom(source: any = {}) {
	        return new InspectionReport(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.title = source["title"];
	        this.createdAt = source["createdAt"];
	        this.hostCount = source["hostCount"];
	        this.issueCount = source["issueCount"];
	        this.durationMs = source["durationMs"];
	        this.hostResults = this.convertValues(source["hostResults"], InspectionHostResult, true);
	        this.summary = source["summary"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	export class LogConfig {
	    enable: boolean;
	    format: string;
	    pathTemplate: string;
	    maxBytes: number;
	
	    static createFrom(source: any = {}) {
	        return new LogConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.enable = source["enable"];
	        this.format = source["format"];
	        this.pathTemplate = source["pathTemplate"];
	        this.maxBytes = source["maxBytes"];
	    }
	}
	
	export class MultiplexChannelDetail {
	    type: string;
	    name: string;
	    sessionId: string;
	    active: boolean;
	    description: string;
	
	    static createFrom(source: any = {}) {
	        return new MultiplexChannelDetail(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.type = source["type"];
	        this.name = source["name"];
	        this.sessionId = source["sessionId"];
	        this.active = source["active"];
	        this.description = source["description"];
	    }
	}
	export class TopologyTunnel {
	    sessionId: string;
	    type: string;
	    localAddr: string;
	    remoteAddr: string;
	    status: string;
	
	    static createFrom(source: any = {}) {
	        return new TopologyTunnel(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.sessionId = source["sessionId"];
	        this.type = source["type"];
	        this.localAddr = source["localAddr"];
	        this.remoteAddr = source["remoteAddr"];
	        this.status = source["status"];
	    }
	}
	export class TopologyEdge {
	    id: string;
	    source: string;
	    target: string;
	    type: string;
	    label: string;
	    status?: string;
	    rttMs?: number;
	
	    static createFrom(source: any = {}) {
	        return new TopologyEdge(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.source = source["source"];
	        this.target = source["target"];
	        this.type = source["type"];
	        this.label = source["label"];
	        this.status = source["status"];
	        this.rttMs = source["rttMs"];
	    }
	}
	export class TopologyNode {
	    id: string;
	    label: string;
	    host: string;
	    port: number;
	    user: string;
	    type: string;
	    status: string;
	    uptime: string;
	    activeTunnelsCount: number;
	    rttMs: number;
	    errorMessage?: string;
	
	    static createFrom(source: any = {}) {
	        return new TopologyNode(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.label = source["label"];
	        this.host = source["host"];
	        this.port = source["port"];
	        this.user = source["user"];
	        this.type = source["type"];
	        this.status = source["status"];
	        this.uptime = source["uptime"];
	        this.activeTunnelsCount = source["activeTunnelsCount"];
	        this.rttMs = source["rttMs"];
	        this.errorMessage = source["errorMessage"];
	    }
	}
	export class NetworkTopologyData {
	    nodes: TopologyNode[];
	    edges: TopologyEdge[];
	    tunnels: TopologyTunnel[];
	
	    static createFrom(source: any = {}) {
	        return new NetworkTopologyData(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.nodes = this.convertValues(source["nodes"], TopologyNode);
	        this.edges = this.convertValues(source["edges"], TopologyEdge);
	        this.tunnels = this.convertValues(source["tunnels"], TopologyTunnel);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class PodInfo {
	    name: string;
	    namespace: string;
	    status: string;
	    ready: string;
	    restarts: number;
	    age: string;
	    ip: string;
	    node: string;
	    containers: string[];
	
	    static createFrom(source: any = {}) {
	        return new PodInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.namespace = source["namespace"];
	        this.status = source["status"];
	        this.ready = source["ready"];
	        this.restarts = source["restarts"];
	        this.age = source["age"];
	        this.ip = source["ip"];
	        this.node = source["node"];
	        this.containers = source["containers"];
	    }
	}
	
	
	export class ReachabilityDiagnosisResult {
	    target: string;
	    healthy: boolean;
	    totalRttMs: number;
	    hops: HopDiagnosisDetail[];
	    conclusion: string;
	    suggestion: string;
	    diagnosedAt: string;
	
	    static createFrom(source: any = {}) {
	        return new ReachabilityDiagnosisResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.target = source["target"];
	        this.healthy = source["healthy"];
	        this.totalRttMs = source["totalRttMs"];
	        this.hops = this.convertValues(source["hops"], HopDiagnosisDetail);
	        this.conclusion = source["conclusion"];
	        this.suggestion = source["suggestion"];
	        this.diagnosedAt = source["diagnosedAt"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class RemotePortItem {
	    protocol: string;
	    localAddr: string;
	    process: string;
	    pid: number;
	    state: string;
	
	    static createFrom(source: any = {}) {
	        return new RemotePortItem(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.protocol = source["protocol"];
	        this.localAddr = source["localAddr"];
	        this.process = source["process"];
	        this.pid = source["pid"];
	        this.state = source["state"];
	    }
	}
	export class RemoteProcessItem {
	    pid: number;
	    user: string;
	    cpu: number;
	    mem: number;
	    status: string;
	    time: string;
	    command: string;
	
	    static createFrom(source: any = {}) {
	        return new RemoteProcessItem(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.pid = source["pid"];
	        this.user = source["user"];
	        this.cpu = source["cpu"];
	        this.mem = source["mem"];
	        this.status = source["status"];
	        this.time = source["time"];
	        this.command = source["command"];
	    }
	}
	export class RemoteServiceItem {
	    unit: string;
	    load: string;
	    active: string;
	    sub: string;
	    description: string;
	
	    static createFrom(source: any = {}) {
	        return new RemoteServiceItem(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.unit = source["unit"];
	        this.load = source["load"];
	        this.active = source["active"];
	        this.sub = source["sub"];
	        this.description = source["description"];
	    }
	}
	export class RunbookStepResult {
	    stepId: string;
	    stepName: string;
	    command: string;
	    status: string;
	    output: string;
	    exitCode: number;
	    durationMs: number;
	
	    static createFrom(source: any = {}) {
	        return new RunbookStepResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.stepId = source["stepId"];
	        this.stepName = source["stepName"];
	        this.command = source["command"];
	        this.status = source["status"];
	        this.output = source["output"];
	        this.exitCode = source["exitCode"];
	        this.durationMs = source["durationMs"];
	    }
	}
	export class RunbookExecutionRecord {
	    id: string;
	    runbookId: string;
	    runbookName: string;
	    startTime: string;
	    endTime: string;
	    status: string;
	    targetHost: string;
	    variableValues: Record<string, string>;
	    stepResults: RunbookStepResult[];
	
	    static createFrom(source: any = {}) {
	        return new RunbookExecutionRecord(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.runbookId = source["runbookId"];
	        this.runbookName = source["runbookName"];
	        this.startTime = source["startTime"];
	        this.endTime = source["endTime"];
	        this.status = source["status"];
	        this.targetHost = source["targetHost"];
	        this.variableValues = source["variableValues"];
	        this.stepResults = this.convertValues(source["stepResults"], RunbookStepResult);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class RunbookStep {
	    id: string;
	    name: string;
	    description: string;
	    command: string;
	    timeoutSeconds: number;
	    continueOnError: boolean;
	    targetSessionId: string;
	
	    static createFrom(source: any = {}) {
	        return new RunbookStep(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.description = source["description"];
	        this.command = source["command"];
	        this.timeoutSeconds = source["timeoutSeconds"];
	        this.continueOnError = source["continueOnError"];
	        this.targetSessionId = source["targetSessionId"];
	    }
	}
	
	export class RunbookVariable {
	    name: string;
	    description: string;
	    defaultValue: string;
	    required: boolean;
	    type: string;
	    options: string[];
	
	    static createFrom(source: any = {}) {
	        return new RunbookVariable(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.description = source["description"];
	        this.defaultValue = source["defaultValue"];
	        this.required = source["required"];
	        this.type = source["type"];
	        this.options = source["options"];
	    }
	}
	export class RunbookTemplate {
	    id: string;
	    name: string;
	    description: string;
	    category: string;
	    tags: string[];
	    variables: RunbookVariable[];
	    steps: RunbookStep[];
	    createdAt: string;
	    updatedAt: string;
	
	    static createFrom(source: any = {}) {
	        return new RunbookTemplate(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.description = source["description"];
	        this.category = source["category"];
	        this.tags = source["tags"];
	        this.variables = this.convertValues(source["variables"], RunbookVariable);
	        this.steps = this.convertValues(source["steps"], RunbookStep);
	        this.createdAt = source["createdAt"];
	        this.updatedAt = source["updatedAt"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	export class SSHPoolStat {
	    key: string;
	    host: string;
	    port: number;
	    user: string;
	    refCount: number;
	    activeChannelsCount: number;
	    channelsBreakdown: Record<string, number>;
	    idleSeconds: number;
	    activeSince: string;
	    maxSessionsReached: boolean;
	
	    static createFrom(source: any = {}) {
	        return new SSHPoolStat(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.key = source["key"];
	        this.host = source["host"];
	        this.port = source["port"];
	        this.user = source["user"];
	        this.refCount = source["refCount"];
	        this.activeChannelsCount = source["activeChannelsCount"];
	        this.channelsBreakdown = source["channelsBreakdown"];
	        this.idleSeconds = source["idleSeconds"];
	        this.activeSince = source["activeSince"];
	        this.maxSessionsReached = source["maxSessionsReached"];
	    }
	}
	export class SSHTunnel {
	    type: string;
	    localAddr: string;
	    remoteAddr: string;
	
	    static createFrom(source: any = {}) {
	        return new SSHTunnel(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.type = source["type"];
	        this.localAddr = source["localAddr"];
	        this.remoteAddr = source["remoteAddr"];
	    }
	}
	export class SerialConfig {
	    port: string;
	    baudRate: number;
	    dataBits: number;
	    stopBits: string;
	    parity: string;
	    flowControl: string;
	    dtr: boolean;
	    rts: boolean;
	
	    static createFrom(source: any = {}) {
	        return new SerialConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.port = source["port"];
	        this.baudRate = source["baudRate"];
	        this.dataBits = source["dataBits"];
	        this.stopBits = source["stopBits"];
	        this.parity = source["parity"];
	        this.flowControl = source["flowControl"];
	        this.dtr = source["dtr"];
	        this.rts = source["rts"];
	    }
	}
	export class SessionMultiplexInfo {
	    sessionId: string;
	    poolKey: string;
	    isPooled: boolean;
	    host: string;
	    port: number;
	    user: string;
	    physicalConnections: number;
	    activeChannelsCount: number;
	    channelsBreakdown: Record<string, number>;
	    channelDetails: MultiplexChannelDetail[];
	    stealthAuditNote: string;
	    estimatedRttSavedMs: number;
	    createdAt: string;
	
	    static createFrom(source: any = {}) {
	        return new SessionMultiplexInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.sessionId = source["sessionId"];
	        this.poolKey = source["poolKey"];
	        this.isPooled = source["isPooled"];
	        this.host = source["host"];
	        this.port = source["port"];
	        this.user = source["user"];
	        this.physicalConnections = source["physicalConnections"];
	        this.activeChannelsCount = source["activeChannelsCount"];
	        this.channelsBreakdown = source["channelsBreakdown"];
	        this.channelDetails = this.convertValues(source["channelDetails"], MultiplexChannelDetail);
	        this.stealthAuditNote = source["stealthAuditNote"];
	        this.estimatedRttSavedMs = source["estimatedRttSavedMs"];
	        this.createdAt = source["createdAt"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class SftpFileDetail {
	    content: string;
	    modTime: number;
	    size: number;
	    isImage: boolean;
	
	    static createFrom(source: any = {}) {
	        return new SftpFileDetail(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.content = source["content"];
	        this.modTime = source["modTime"];
	        this.size = source["size"];
	        this.isImage = source["isImage"];
	    }
	}
	export class ShareSessionStatus {
	    sessionId: string;
	    isSharing: boolean;
	    token: string;
	    mode: string;
	    shareUrl: string;
	    localUrl: string;
	    hasPassword: boolean;
	    viewerCount: number;
	    maxViewers: number;
	    startTime: number;
	    expireTime: number;
	    remainingSecs: number;
	
	    static createFrom(source: any = {}) {
	        return new ShareSessionStatus(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.sessionId = source["sessionId"];
	        this.isSharing = source["isSharing"];
	        this.token = source["token"];
	        this.mode = source["mode"];
	        this.shareUrl = source["shareUrl"];
	        this.localUrl = source["localUrl"];
	        this.hasPassword = source["hasPassword"];
	        this.viewerCount = source["viewerCount"];
	        this.maxViewers = source["maxViewers"];
	        this.startTime = source["startTime"];
	        this.expireTime = source["expireTime"];
	        this.remainingSecs = source["remainingSecs"];
	    }
	}
	
	export class SystemShellInfo {
	    name: string;
	    path: string;
	
	    static createFrom(source: any = {}) {
	        return new SystemShellInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.path = source["path"];
	    }
	}
	export class TOTPCodeResult {
	    entryId: string;
	    label: string;
	    code: string;
	    remainingSecs: number;
	    period: number;
	
	    static createFrom(source: any = {}) {
	        return new TOTPCodeResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.entryId = source["entryId"];
	        this.label = source["label"];
	        this.code = source["code"];
	        this.remainingSecs = source["remainingSecs"];
	        this.period = source["period"];
	    }
	}
	export class TOTPEntry {
	    id: string;
	    label: string;
	    issuer: string;
	    accountName: string;
	    secretEnc: string;
	    algorithm: string;
	    digits: number;
	    period: number;
	    createdAt: number;
	    updatedAt: number;
	
	    static createFrom(source: any = {}) {
	        return new TOTPEntry(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.label = source["label"];
	        this.issuer = source["issuer"];
	        this.accountName = source["accountName"];
	        this.secretEnc = source["secretEnc"];
	        this.algorithm = source["algorithm"];
	        this.digits = source["digits"];
	        this.period = source["period"];
	        this.createdAt = source["createdAt"];
	        this.updatedAt = source["updatedAt"];
	    }
	}
	
	
	
	export class TriggerRule {
	    expect: string;
	    send: string;
	    isRegex: boolean;
	
	    static createFrom(source: any = {}) {
	        return new TriggerRule(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.expect = source["expect"];
	        this.send = source["send"];
	        this.isRegex = source["isRegex"];
	    }
	}
	export class TunnelStatusInfo {
	    id: string;
	    sessionId: string;
	    sessionName: string;
	    type: string;
	    localAddr: string;
	    remoteAddr: string;
	    status: string;
	    activeConns: number;
	    createdAt: string;
	
	    static createFrom(source: any = {}) {
	        return new TunnelStatusInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.sessionId = source["sessionId"];
	        this.sessionName = source["sessionName"];
	        this.type = source["type"];
	        this.localAddr = source["localAddr"];
	        this.remoteAddr = source["remoteAddr"];
	        this.status = source["status"];
	        this.activeConns = source["activeConns"];
	        this.createdAt = source["createdAt"];
	    }
	}
	export class UpdateAssetInfo {
	    name: string;
	    downloadUrl: string;
	    size: number;
	    browserUrl: string;
	
	    static createFrom(source: any = {}) {
	        return new UpdateAssetInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.downloadUrl = source["downloadUrl"];
	        this.size = source["size"];
	        this.browserUrl = source["browserUrl"];
	    }
	}
	export class UpdateCheckResult {
	    hasUpdate: boolean;
	    currentVersion: string;
	    latestVersion: string;
	    releaseTitle: string;
	    releaseNotes: string;
	    publishedAt: string;
	    htmlUrl: string;
	    platformOS: string;
	    platformArch: string;
	    targetAsset?: UpdateAssetInfo;
	
	    static createFrom(source: any = {}) {
	        return new UpdateCheckResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.hasUpdate = source["hasUpdate"];
	        this.currentVersion = source["currentVersion"];
	        this.latestVersion = source["latestVersion"];
	        this.releaseTitle = source["releaseTitle"];
	        this.releaseNotes = source["releaseNotes"];
	        this.publishedAt = source["publishedAt"];
	        this.htmlUrl = source["htmlUrl"];
	        this.platformOS = source["platformOS"];
	        this.platformArch = source["platformArch"];
	        this.targetAsset = this.convertValues(source["targetAsset"], UpdateAssetInfo);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class WSLDistroInfo {
	    name: string;
	    isDefault: boolean;
	    version: number;
	
	    static createFrom(source: any = {}) {
	        return new WSLDistroInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.isDefault = source["isDefault"];
	        this.version = source["version"];
	    }
	}
	export class WorkspaceTabState {
	    sessionId: string;
	    customName: string;
	    isLocked: boolean;
	
	    static createFrom(source: any = {}) {
	        return new WorkspaceTabState(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.sessionId = source["sessionId"];
	        this.customName = source["customName"];
	        this.isLocked = source["isLocked"];
	    }
	}
	export class WorkspaceState {
	    tabs: WorkspaceTabState[];
	    activeTabId: string;
	    splitMode: string;
	    secondaryTabId: string;
	    lastSavedAt: string;
	
	    static createFrom(source: any = {}) {
	        return new WorkspaceState(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.tabs = this.convertValues(source["tabs"], WorkspaceTabState);
	        this.activeTabId = source["activeTabId"];
	        this.splitMode = source["splitMode"];
	        this.secondaryTabId = source["secondaryTabId"];
	        this.lastSavedAt = source["lastSavedAt"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

