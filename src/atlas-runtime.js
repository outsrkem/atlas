// atlas-runtime.js
(function () {
    const CDN_BASE = (function () {
        const value = "{{CDN_BASE}}";
        if (value === "__CDN_BASE_DEFAULT__") {
            return window.location.origin + "/atlas";
        }
        return value;
    })();

    window.Atlas = {
        bus: null,
    };

    // Fixed event bus implementation
    function initEventBus() {
        const events = Object.create(null);
        window.Atlas.bus = {
            on(name, callback) {
                if (!events[name]) {
                    events[name] = [];
                }
                // Prevent duplicate callbacks
                if (!events[name].includes(callback)) {
                    events[name].push(callback);
                }
            },
            emit(name, ...args) {
                const handlerList = events[name] || [];
                for (let i = 0; i < handlerList.length; i++) {
                    try {
                        const cb = handlerList[i];
                        if (typeof cb === "function") {
                            cb(...args);
                        }
                    } catch (error) {
                        console.error(`[EventBus] Error executing listener for event ${name}:`, error);
                    }
                }
            },
            off(name, callback) {
                if (!events[name]) return;
                if (callback) {
                    const index = events[name].indexOf(callback);
                    if (index !== -1) {
                        events[name].splice(index, 1);
                    }
                } else {
                    events[name] = [];
                }
            },
            getEvents(name) {
                return name ? events[name] || [] : events;
            },
        };
    }

    const ResourceLoader = {
        async loadScript(url) {
            return new Promise((resolve, reject) => {
                const script = document.createElement("script");
                script.src = url;
                script.onload = () => resolve();
                script.onerror = (err) => reject(`Script failed to load ${url}`);
                document.body.appendChild(script);
            });
        },
        async loadStyle(url) {
            return new Promise((resolve, reject) => {
                const link = document.createElement("link");
                link.rel = "stylesheet";
                link.href = url;
                link.onload = () => resolve();
                link.onerror = (err) => reject(`Style failed to load ${url}`);
                document.head.appendChild(link);
            });
        },
        async loadHtml(url) {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTML ${url} status:${res.status}`);
            const html = await res.text();
            return html;
        },
    };

    async function mountComponent(compName) {
        const htmlUrl = `${CDN_BASE}/components/${compName}/index.html`;
        const cssUrl = `${CDN_BASE}/components/${compName}/style.css`;

        const htmlPromise = ResourceLoader.loadHtml(htmlUrl);
        const cssPromise = ResourceLoader.loadStyle(cssUrl);
        const [htmlText] = await Promise.all([htmlPromise, cssPromise]);

        const mountNode = document.createElement("div");
        mountNode.id = `atlas-mount-${compName}`;
        mountNode.innerHTML = htmlText;
        mountNode.style.visibility = "hidden";
        document.body.prepend(mountNode);

        await cssPromise;
        mountNode.style.visibility = "visible";

        await ResourceLoader.loadScript(`${CDN_BASE}/components/${compName}/main.js`);
        window.Atlas.bus.emit("atlas:component-mounted", { name: compName });
    }

    async function bootstrap() {
        initEventBus();

        if (!window.Atlas.bus) {
            console.error("[Atlas] EventBus initialization failed");
            return;
        }

        try {
            // Load auth service
            await ResourceLoader.loadScript(`${CDN_BASE}/utils/auth-service.js`);

            // Wait for auth module initialization
            let retryCount = 0;
            while (!window.Atlas?.auth && retryCount < 30) {
                await new Promise((resolve) => setTimeout(resolve, 50));
                retryCount++;
            }

            if (!window.Atlas?.auth) {
                console.error("[Atlas] auth module initialization timeout");
            }

            // Load components
            const components = ["top-header"];
            for (const name of components) {
                await mountComponent(name);
            }

            if (window.Atlas.bus && typeof window.Atlas.bus.emit === "function") {
                window.Atlas.bus.emit("atlas:ready");
            }
        } catch (err) {
            console.error("[Atlas] Startup failed", err);
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", bootstrap);
    } else {
        bootstrap();
    }
})();
