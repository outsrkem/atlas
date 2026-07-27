### Atlas 基座

沟通术语：Atlas 组件、Atlas 运行时、Atlas 远程资源

> 原生公共全局 UI 区块、跨多个业务系统、远程动态加载、持续扩展头部 / 侧边栏 / 弹窗等通用组件

#### 构建

> 已构建的包不支持非同源环境，需要重新构建.
>
> 使用--cdn_base指定地址.

```
Usage:
  No param    : npm run build  (use default)
  With value  : npm run build -- --cdn_base=https://cdn.example.com
```

#### 开发

临时修改`atlas-runtime.js`

```javascript
    const CDN_BASE = (function () {
    	// 在开始位置找到代码块，临时添加这个if判断的逻辑
        if (window.ATLAS_CDN_ROOT && window.ATLAS_CDN_ROOT.trim()) {
            return window.ATLAS_CDN_ROOT.trim().replace(/\/+$/, "") + "/src";
        }
        // 以下是原有代码
        const value = "{{CDN_BASE}}";
        if (value === "__CDN_BASE_DEFAULT__") {
            return window.location.origin + "/atlas";
        }
        return value;
    })();
```

> 切换到项目根目录

```
npm -i
serve . -p 9090 --cors
```

> 访问`http://localhost:9090`

