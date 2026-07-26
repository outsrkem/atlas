(function () {
    // Wait for bus to be ready
    if (!window.Atlas || !window.Atlas.bus) {
        console.error("[Header] Atlas.bus unavailable");
        return;
    }

    const bus = window.Atlas.bus;
    let binded = false;
    let initPromise = null;
    let refreshHandlerBound = false;

    function formatWeek(weekIndex) {
        const week = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
        return week[weekIndex];
    }

    function renderDate() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const day = String(now.getDate()).padStart(2, "0");
        const w = formatWeek(now.getDay());
        const dateEl = document.getElementById("atlas-header-date");
        if (dateEl) dateEl.innerText = `${year}-${month}-${day} ${w}`;
    }

    function setUserName(userInfo) {
        if (!userInfo) return;
        const usernameEl = document.getElementById("atlas-header-username");
        if (usernameEl) {
            usernameEl.innerText = `${userInfo.username || ""}(${userInfo.account || ""})`;
        }
    }

    function handleRefreshUser(info) {
        if (info) {
            setUserName(info);
        } else {
            const auth = window.Atlas?.auth;
            if (auth) {
                const user = auth.getUser();
                if (user) {
                    setUserName(user);
                } else {
                    auth.fetchUserInfo().then((user) => {
                        if (user) setUserName(user);
                    });
                }
            }
        }
    }

    async function mountHeaderLogic() {
        if (binded) {
            return;
        }

        if (initPromise) {
            return initPromise;
        }

        initPromise = (async () => {
            try {
                const usernameEl = document.getElementById("atlas-header-username");
                const btnUserCenter = document.getElementById("atlas-btn-usercenter");
                const btnLogout = document.getElementById("atlas-btn-logout");
                const consoleLink = document.getElementById("atlas-link-console");

                if (!usernameEl || !btnUserCenter || !btnLogout || !consoleLink) {
                    await new Promise((resolve) => setTimeout(resolve, 100));
                    return mountHeaderLogic();
                }

                binded = true;

                // Wait for auth module
                let retryCount = 0;
                while (!window.Atlas?.auth && retryCount < 20) {
                    await new Promise((resolve) => setTimeout(resolve, 50));
                    retryCount++;
                }

                if (!window.Atlas?.auth) {
                    console.error("[Header] Auth module initialization timeout");
                    binded = false;
                    return;
                }

                const auth = window.Atlas.auth;
                renderDate();

                const config = auth.getConfig();
                consoleLink.href = config.consolePage;

                let user = auth.getUser();
                if (!user) {
                    user = await auth.fetchUserInfo();
                }

                if (user) {
                    setUserName(user);
                }

                btnUserCenter.onclick = () => auth.goUserCenter();
                btnLogout.onclick = () => {
                    if (confirm("Are you sure you want to logout?")) {
                        auth.logout();
                    }
                };

                if (!refreshHandlerBound) {
                    bus.on("atlas:refresh-user", handleRefreshUser);
                    refreshHandlerBound = true;
                }

                console.log("[Header] Initialization complete");
            } catch (error) {
                console.error("[Header] Initialization failed:", error);
                binded = false;
            } finally {
                initPromise = null;
            }
        })();

        return initPromise;
    }

    // Listen for component mount event
    bus.on("atlas:component-mounted", (info) => {
        if (info && info.name === "top-header" && !binded) {
            mountHeaderLogic();
        }
    });

    // Auto initialize after page load
    if (document.readyState === "complete") {
        setTimeout(() => {
            if (!binded) {
                mountHeaderLogic();
            }
        }, 200);
    } else {
        window.addEventListener("load", () => {
            setTimeout(() => {
                if (!binded) {
                    mountHeaderLogic();
                }
            }, 200);
        });
    }
})();
