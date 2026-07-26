(function () {
    function initAuthModule() {
        if (!window.Atlas) {
            setTimeout(initAuthModule, 50);
            return;
        }

        if (!window.Atlas.bus) {
            setTimeout(initAuthModule, 50);
            return;
        }

        // Built-in default config
        const DEFAULT_CONFIG = {
            loginPage: "/authui/login.html",
            userCenterPage: "/console/#/accountInfo",
            consolePage: "/console",
        };
        const config = Object.assign({}, DEFAULT_CONFIG, window.ATLAS_GLOBAL_CONFIG || {});

        const bus = window.Atlas.bus;
        let cacheUserInfo = null;

        // Skip if already initialized
        if (window.Atlas.auth) {
            return;
        }

        window.Atlas.auth = {
            async fetchUserInfo(forceRefresh = false) {
                if (!forceRefresh && cacheUserInfo) {
                    return cacheUserInfo;
                }

                try {
                    const res = await fetch("/api/uias/v1/uias/user/basicInfo", {
                        method: "GET",
                        credentials: "include",
                        mode: "cors",
                        headers: {
                            "Content-Type": "application/json",
                            Accept: "application/json",
                            "Cache-Control": "no-cache",
                        },
                        cache: "no-store",
                    });

                    // Redirect to login only on 401
                    if (res.status === 401) {
                        this.goLogin();
                        return null;
                    }

                    const json = await res.json();
                    cacheUserInfo = json.payload?.userinfo || {};

                    if (bus && typeof bus.emit === "function") {
                        bus.emit("atlas:user-ready", cacheUserInfo);
                    }

                    return cacheUserInfo;
                } catch (err) {
                    console.error("[Auth] Failed to fetch user info:", err);
                    return null;
                }
            },

            async logout() {
                if (bus && typeof bus.emit === "function") {
                    bus.emit("atlas:before-logout");
                }

                try {
                    await fetch("/api/uias/v1/user/logout", {
                        method: "POST",
                        credentials: "include",
                        headers: {
                            "Content-Type": "application/json",
                        },
                    });
                } catch (e) {
                    console.error("[Auth] Logout failed:", e);
                }

                cacheUserInfo = null;
                sessionStorage.removeItem("active-path");
                this.goLogin();
            },

            goLogin() {
                if (window.location.href.startsWith(config.loginPage)) {
                    return;
                }

                const returnUrl = encodeURIComponent(window.location.href);
                const target = `${config.loginPage}?returnto=${returnUrl}`;
                window.location.href = target;
            },

            goUserCenter() {
                window.location.href = config.userCenterPage;
            },

            getUser() {
                return cacheUserInfo;
            },

            getConfig() {
                return config;
            },

            clearCache() {
                cacheUserInfo = null;
            },
        };
    }

    // Wait for Atlas and bus to be ready
    function waitForAtlas() {
        if (window.Atlas && window.Atlas.bus) {
            initAuthModule();
        } else {
            setTimeout(waitForAtlas, 50);
        }
    }

    waitForAtlas();
})();
