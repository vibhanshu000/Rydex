/**
 * Server-side Zego Kit Token generator.
 *
 * Safe for Next.js API routes (Node.js runtime).
 * Sets up lightweight browser mocks before requiring @zegocloud/zego-uikit-prebuilt
 * so that Zego's official token generation algorithm runs without `document is not defined` errors.
 */

function setupNodeBrowserMocks() {
    if (typeof window === "undefined") {
        const mockElem: any = {
            setAttribute: () => {},
            style: {},
            appendChild: () => {},
            insertBefore: () => {},
            removeChild: () => {},
            addEventListener: () => {},
            removeEventListener: () => {}
        };
        const head: any = {
            appendChild: () => {},
            insertBefore: () => {},
            removeChild: () => {}
        };
        (global as any).window = {
            location: { href: "http://localhost" },
            addEventListener: () => {},
            removeEventListener: () => {},
            navigator: { userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
            btoa: (str: string) => Buffer.from(str, "binary").toString("base64"),
            atob: (str: string) => Buffer.from(str, "base64").toString("binary")
        };
        (global as any).self = (global as any).window;
        (global as any).btoa = (global as any).window.btoa;
        (global as any).atob = (global as any).window.atob;
        (global as any).document = {
            createElement: () => mockElem,
            createTextNode: () => ({}),
            getElementsByTagName: () => [head],
            querySelector: () => head,
            querySelectorAll: () => [],
            head,
            body: head
        };
        (global as any).navigator = (global as any).window.navigator;
    }
}

/**
 * Generates a official Zego UIKit Kit Token for the given room and user on the server.
 * Uses the official ZegoUIKitPrebuilt.generateKitTokenForTest method under the hood.
 */
export function generateKitTokenForServer(
    appId: number,
    serverSecret: string,
    roomId: string,
    userId: string,
    userName: string,
    effectiveSeconds: number = 3600
): string {
    setupNodeBrowserMocks();
    // Dynamically require to ensure mocks are in place first
    const { ZegoUIKitPrebuilt } = require("@zegocloud/zego-uikit-prebuilt");
    return ZegoUIKitPrebuilt.generateKitTokenForTest(
        appId,
        serverSecret,
        roomId,
        userId,
        userName,
        effectiveSeconds
    );
}
