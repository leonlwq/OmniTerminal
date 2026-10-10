//go:build darwin

package core

/*
#cgo CFLAGS: -x objective-c
#cgo LDFLAGS: -framework Cocoa

#import <Cocoa/Cocoa.h>
#import <objc/runtime.h>

extern void onTrayShowClicked();
extern void onTrayQuitClicked();

static id globalTrayTarget = nil;
static NSStatusItem *globalStatusItem = nil;
static BOOL dockReopenHooked = NO;

static void trayShowIMP(id self, SEL _cmd, id sender) {
    for (NSWindow *w in [NSApp windows]) {
        if (![w isKindOfClass:[NSPanel class]]) {
            [w makeKeyAndOrderFront:nil];
            [w setIsVisible:YES];
        }
    }
    [NSApp activateIgnoringOtherApps:YES];
    onTrayShowClicked();
}

static void trayQuitIMP(id self, SEL _cmd, id sender) {
    onTrayQuitClicked();
}

static BOOL customAppReopenHandler(id self, SEL _cmd, NSApplication *sender, BOOL hasVisibleWindows) {
    for (NSWindow *w in [sender windows]) {
        if (![w isKindOfClass:[NSPanel class]]) {
            [w makeKeyAndOrderFront:nil];
            [w setIsVisible:YES];
        }
    }
    [sender activateIgnoringOtherApps:YES];
    onTrayShowClicked();
    return YES;
}

static NSApplicationTerminateReply (*orig_applicationShouldTerminate)(id, SEL, NSApplication *) = NULL;

static NSApplicationTerminateReply customApplicationShouldTerminate(id self, SEL _cmd, NSApplication *sender) {
    onTrayQuitClicked();
    if (orig_applicationShouldTerminate != NULL) {
        return orig_applicationShouldTerminate(self, _cmd, sender);
    }
    return NSTerminateNow;
}

static void setupDarwinAppReopen() {
    dispatch_async(dispatch_get_main_queue(), ^{
        if (dockReopenHooked) {
            return;
        }
        id delegate = [NSApp delegate];
        if (delegate) {
            Class delClass = [delegate class];
            SEL reopenSel = @selector(applicationShouldHandleReopen:hasVisibleWindows:);
            if (!class_getInstanceMethod(delClass, reopenSel)) {
                class_addMethod(delClass, reopenSel, (IMP)customAppReopenHandler, "c@:@c");
            }

            SEL termSel = @selector(applicationShouldTerminate:);
            Method termMethod = class_getInstanceMethod(delClass, termSel);
            if (termMethod != NULL && orig_applicationShouldTerminate == NULL) {
                orig_applicationShouldTerminate = (NSApplicationTerminateReply (*)(id, SEL, NSApplication *))method_getImplementation(termMethod);
                method_setImplementation(termMethod, (IMP)customApplicationShouldTerminate);
            }

            dockReopenHooked = YES;
        }

        // 注册全局激活通知：当用户点击 Dock 图标时触发
        static BOOL notificationObserved = NO;
        if (!notificationObserved) {
            notificationObserved = YES;
            [[NSNotificationCenter defaultCenter] addObserverForName:NSApplicationDidBecomeActiveNotification
                object:nil
                queue:[NSOperationQueue mainQueue]
                usingBlock:^(NSNotification *note) {
                    BOOL hasVisible = NO;
                    for (NSWindow *w in [NSApp windows]) {
                        if ([w isVisible] && ![w isKindOfClass:[NSPanel class]]) {
                            hasVisible = YES;
                            break;
                        }
                    }
                    if (!hasVisible) {
                        for (NSWindow *w in [NSApp windows]) {
                            if (![w isKindOfClass:[NSPanel class]]) {
                                [w makeKeyAndOrderFront:nil];
                                [w setIsVisible:YES];
                            }
                        }
                        [NSApp activateIgnoringOtherApps:YES];
                        onTrayShowClicked();
                    }
                }];
        }
    });
}

static NSImage *gEmbeddedTrayIcon = nil;

static void setEmbeddedTrayIcon(const void *bytes, int len) {
    if (bytes != NULL && len > 0) {
        NSData *data = [NSData dataWithBytes:bytes length:len];
        NSImage *img = [[NSImage alloc] initWithData:data];
        if (img) {
            [img setSize:NSMakeSize(18, 18)];
            [img setTemplate:NO]; // 保持彩色渲染，与 Dock 图标效果完全一致
            if (gEmbeddedTrayIcon) {
                [gEmbeddedTrayIcon release];
            }
            gEmbeddedTrayIcon = [img retain];
        }
    }
}

static NSImage *getAppTrayIcon() {
    if (gEmbeddedTrayIcon) {
        return gEmbeddedTrayIcon;
    }

    NSImage *appIcon = [NSApp applicationIconImage];
    if (!appIcon) {
        appIcon = [[NSBundle mainBundle] imageForResource:@"iconfile"];
    }
    if (!appIcon) {
        NSString *resourcePath = [[NSBundle mainBundle] pathForResource:@"iconfile" ofType:@"icns"];
        if (resourcePath) {
            appIcon = [[NSImage alloc] initWithContentsOfFile:resourcePath];
        }
    }
    if (!appIcon) {
        appIcon = [[NSImage alloc] initWithContentsOfFile:@"build/appicon.png"];
    }

    if (appIcon) {
        NSImage *trayIcon = [[NSImage alloc] initWithSize:NSMakeSize(18, 18)];
        [trayIcon lockFocus];
        [[NSGraphicsContext currentContext] setImageInterpolation:NSImageInterpolationHigh];
        [appIcon drawInRect:NSMakeRect(0, 0, 18, 18)
                   fromRect:NSZeroRect
                  operation:NSCompositingOperationCopy
                   fraction:1.0];
        [trayIcon unlockFocus];
        [trayIcon setTemplate:NO]; // 保持彩色渲染，与 Dock 图标效果完全一致
        return trayIcon;
    }

    return nil;
}

static void showDarwinTray() {
    dispatch_async(dispatch_get_main_queue(), ^{
        setupDarwinAppReopen();

        if (globalTrayTarget == nil) {
            Class targetClass = objc_getClass("OmniTrayTarget");
            if (!targetClass) {
                targetClass = objc_allocateClassPair([NSObject class], "OmniTrayTarget", 0);
                class_addMethod(targetClass, @selector(onShowAction:), (IMP)trayShowIMP, "v@:@");
                class_addMethod(targetClass, @selector(onQuitAction:), (IMP)trayQuitIMP, "v@:@");
                objc_registerClassPair(targetClass);
            }
            globalTrayTarget = [[targetClass alloc] init];
        }

        if (globalStatusItem == nil) {
            NSStatusBar *statusBar = [NSStatusBar systemStatusBar];
            // 使用标准方块尺寸 NSSquareStatusItemLength，无右侧多余文本与空白
            globalStatusItem = [[statusBar statusItemWithLength:NSSquareStatusItemLength] retain];
            globalStatusItem.visible = YES;

            if (globalStatusItem.button) {
                NSImage *icon = getAppTrayIcon();
                if (icon) {
                    globalStatusItem.button.image = icon;
                }
                globalStatusItem.button.imagePosition = NSImageOnly;
                globalStatusItem.button.title = @"";
            }

            NSMenu *menu = [[NSMenu alloc] initWithTitle:@"OmniTerminalTray"];

            NSMenuItem *showItem = [[NSMenuItem alloc] initWithTitle:@"🖥️ 显示主窗口" action:@selector(onShowAction:) keyEquivalent:@""];
            [showItem setTarget:globalTrayTarget];
            [menu addItem:showItem];

            [menu addItem:[NSMenuItem separatorItem]];

            NSMenuItem *quitItem = [[NSMenuItem alloc] initWithTitle:@"🚪 退出 OmniTerminal" action:@selector(onQuitAction:) keyEquivalent:@"q"];
            [quitItem setTarget:globalTrayTarget];
            [menu addItem:quitItem];

            globalStatusItem.menu = menu;
        } else if (globalStatusItem.button) {
            NSImage *icon = getAppTrayIcon();
            if (icon) {
                globalStatusItem.button.image = icon;
            }
            globalStatusItem.button.imagePosition = NSImageOnly;
            globalStatusItem.button.title = @"";
        }
    });
}

static void hideDarwinTray() {
    dispatch_async(dispatch_get_main_queue(), ^{
        if (globalStatusItem != nil) {
            [[NSStatusBar systemStatusBar] removeStatusItem:globalStatusItem];
            [globalStatusItem release];
            globalStatusItem = nil;
        }
    });
}
*/
import "C"

import (
	_ "embed"
	"unsafe"
)

//go:embed tray_icon.png
var embeddedTrayIcon []byte

type darwinTray struct {
	tm *TrayManager
}

func newTrayPlatform(tm *TrayManager) trayImpl {
	return &darwinTray{tm: tm}
}

func (d *darwinTray) setup() {
	if len(embeddedTrayIcon) > 0 {
		C.setEmbeddedTrayIcon(unsafe.Pointer(&embeddedTrayIcon[0]), C.int(len(embeddedTrayIcon)))
	}
	C.setupDarwinAppReopen()
}

func (d *darwinTray) show(title string) {
	if len(embeddedTrayIcon) > 0 {
		C.setEmbeddedTrayIcon(unsafe.Pointer(&embeddedTrayIcon[0]), C.int(len(embeddedTrayIcon)))
	}
	C.showDarwinTray()
}

func (d *darwinTray) hide() {
	C.hideDarwinTray()
}

//export onTrayShowClicked
func onTrayShowClicked() {
	if trayManagerInstance != nil && trayManagerInstance.onShow != nil {
		trayManagerInstance.onShow()
	}
}

//export onTrayQuitClicked
func onTrayQuitClicked() {
	if trayManagerInstance != nil && trayManagerInstance.onQuit != nil {
		trayManagerInstance.onQuit()
	}
}
