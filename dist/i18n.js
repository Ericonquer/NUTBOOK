(function () {
  const STORAGE_KEY = "nutbook.language";
  const DEFAULT_LANGUAGE = "zh-CN";
  const FALLBACK_LANGUAGE = "zh-CN";
  const supportedLanguages = ["zh-CN", "en-US"];

  const translations = {
    "zh-CN": {
      language: {
        name: "简体中文",
        label: "界面语言",
        description: "切换 NUTBOOK 的界面文字、提示和工具栏语言。",
        chinese: "简体中文",
        english: "English"
      },
      nav: {
        browse: "浏览",
        type: "类型",
        all: "所有文件",
        recent: "最近使用",
        starred: "我的收藏",
        markdown: "Markdown",
        html: "HTML",
        settings: "设置",
        thumbnailEngineDisabled: "缩略图引擎未启用"
      },
      actions: {
        addFolder: "添加文件夹",
        addFile: "添加文件",
        addSingleFile: "添加单文件",
        scanLibrary: "扫描资料库",
        scanSkillOutputs: "扫描 Skill 产物",
        rescanLibrary: "重新扫描当前资料库",
        refresh: "刷新",
        refreshList: "刷新列表",
        fillCurrentWorkspace: "填入当前工作区",
        clearTabs: "清空标签页",
        toggleView: "切换视图",
        sortFiles: "排序文件",
        sortSources: "排序来源",
        favoriteFile: "收藏文件",
        unfavoriteFile: "取消收藏",
        favorite: "收藏",
        removeFromNutbook: "从 Nutbook 移除",
        removeFile: "移除文件",
        remove: "移除",
        delete: "删除",
        moreActions: "更多操作",
        save: "保存",
        export: "导出",
        index: "索引",
        scan: "扫描",
        restore: "恢复",
        restoreSelected: "批量恢复",
        attach: "接入",
        connected: "已接入",
        manualAttach: "手动接入",
        excluded: "已排除",
        restoreVisible: "恢复显示",
        excludeSelected: "批量排除",
        detectEngine: "检测引擎",
        rebuildVisible: "重建可见文件",
        rebuildLibrary: "重建资料库",
        copyInstallCommand: "复制安装命令",
        enableSystemChrome: "启用系统 Chrome 截图",
        disableSystemChrome: "关闭系统 Chrome 截图",
        closeSettings: "关闭设置",
        enterPresentation: "演示全屏",
        enterPresentationShortcut: "演示全屏（F）",
        exitPresentation: "退出演示模式",
        exitPresentationShortcut: "退出演示模式（F）",
        applyLink: "应用链接",
        closeLinkInput: "关闭链接输入框",
        createTag: "新增标签",
        addTag: "+ 标签"
      },
      settings: {
        title: "设置",
        subtitle: "管理资料库、标签、偏好和缩略图引擎",
        skills: "Skill 接入",
        libraries: "文件管理",
        tags: "标签管理",
        preferences: "偏好设定",
        thumbnails: "缩略图",
        skillDescription: "这里接入的是 skill 生成产物目录，不是安装、启用或运行 skill 本身。",
        fileSources: "文件来源",
        removedFiles: "已移除文件",
        sourceSearchPlaceholder: "搜索来源或路径...",
        tagsTitle: "标签管理",
        preferencesTitle: "偏好设定",
        preferencesDescription: "管理 Markdown 阅读与编辑相关偏好，后续的大纲导航、代码块主题和表格工具都会从这里控制。",
        thumbnailTitle: "缩略图引擎",
        sourceFolders: "文件夹来源",
        sourceFiles: "单文件来源",
        sourceFoldersDescription: "管理已接入的文件夹来源",
        sourceFilesDescription: "管理单独接入的文件",
        ignoredDescription: "恢复之前从 Nutbook 隐藏的文件",
        codeBlockTheme: "代码块主题",
        codeBlockThemeDescription: "控制 Markdown 预览和编辑态里的代码块外观。",
        darkCodeBlock: "深色代码块",
        lightCodeBlock: "浅色代码块",
        outline: "文档大纲导航",
        outlineDescription: "根据 Markdown 标题生成左侧导航，适合快速跳转长文档结构。",
        tableTools: "表格增强工具",
        tableToolsDescription: "后续用于表格行列增删工具；当前先保存开关偏好。",
        toggleOutline: "切换文档大纲导航",
        toggleTableTools: "切换表格增强工具",
        autoCheckUpdates: "自动检查更新",
        autoCheckUpdatesDescription: "自动检查 GitHub Releases，有新版本时在侧栏 logo 旁提示。",
        updateCurrentVersion: "当前版本",
        updateLatestVersion: "最新版本",
        updateLastChecked: "上次检查",
        updateAvailable: "有新版本可用",
        updateCurrent: "当前已是最新版本",
        updateChecking: "正在检查更新...",
        updateDisabled: "自动检查已关闭",
        updateSettingsLoadFailedPrefix: "读取更新设置失败：",
        updateSettingsSaved: "更新偏好已保存",
        updateSettingsSaveFailedPrefix: "保存更新偏好失败：",
        updateFailedPrefix: "检查失败：",
        updateNetworkUnavailable: "网络不可用",
        updateUnavailable: "暂时无法比较版本",
        updateChecked: "已检查更新",
        updateNotChecked: "尚未检查",
        openRelease: "打开 Release",
        openReleaseFailedPrefix: "打开 Release 失败：",
        screenshotEngine: "截图引擎",
        currentPath: "当前路径",
        copySuccess: "复制成功",
        noGroupContent: "这一组里还没有内容。",
        noRemovedFiles: "还没有已移除文件。",
        noLabels: "还没有标签。",
        noSkillReady: "这一组里还没有可接入的 skill。",
        noSkillManual: "这一组里还没有需要手动接入的 skill。",
        noSkillExcluded: "还没有已排除的 skill。",
        connectedOrReady: "已接入 / 可接入",
        manualSkill: "待手动接入",
        excludedSkill: "已排除",
        ready: "可接入",
        manualRequired: "需手动接入",
        standardOutputMissing: "未识别标准输出目录",
        skillScanSummaryPrefix: "已扫描",
        skillScanSummaryMiddle: "个 skill，当前列出",
        skillScanSummarySuffix: "个",
        folder: "文件夹",
        singleFile: "单文件",
        removed: "已移除",
        sourcePrefix: "来源：",
        duplicateSuffix: "个副本",
        countSuffix: "个",
        thumbnailStatusLoading: "缩略图引擎状态还没加载出来。",
        thumbnailAvailable: "可用",
        thumbnailUnavailableDefault: "未启用，当前使用默认图标",
        thumbnailDefaultIcon: "默认图标",
        thumbnailSystemChrome: "系统 Chrome",
        thumbnailLocalChromium: "本地 Chromium 引擎",
        thumbnailEngineAvailable: "可用缩略图引擎",
        thumbnailHeadlessMissing: "未发现 Headless 截图引擎",
        thumbnailIntro: "未启动缩略图引擎时，会优先使用默认 SVG 图标；点击检测引擎可扫描系统现有引擎，如检测系统不存在引擎，可按照指示安装。",
        thumbnailRebuildHint: "“重建可见文件”只处理当前列表里已经显示出来的文件；“重建资料库”会处理当前资料库下全部 HTML / Markdown 文件。",
        thumbnailInstallHint: "推荐方案：安装 Playwright Chromium 作为正式截图引擎。安装完成后，再点击“检测引擎”即可接入。",
        thumbnailInstallCommand: "请在终端中运行：",
        systemChromeHint: "备选方案：系统已检测到 Chrome。你可以启用它作为备用截图方案；启用后，Nutbook 会在后台调用 Chrome 截取缩略图，并在状态栏明确显示进度。",
        systemChromeSlowHint: "如果文件量比较大，系统截图可能会耗时较久，这是正常现象。",
        systemChromeEnabledHint: "当前正在使用系统 Chrome 生成缩略图。你可以随时关闭，关闭后 Nutbook 会继续使用默认图标。"
      },
      sort: {
        modifiedAt: "按修改时间",
        fileName: "按文件名",
        lastOpened: "按打开时间",
        tags: "按标签",
        name: "按名称",
        path: "按路径",
        kind: "按类型",
        recentFirst: "最近添加"
      },
      home: {
        searchPlaceholder: "搜索文件...",
        fileList: "文件列表",
        waitingScan: "等待扫描",
        bootLoadingTitle: "正在加载资料库",
        bootLoadingBody: "文件列表马上就绪。",
        noTabs: "没有打开的标签页",
        noTabsHint: "点击左侧“所有文件”重新打开首页，或从资料库中打开一个文件。",
        openAFile: "先打开一个文件",
        noFiles: "还没有文件",
        noStarred: "还没有收藏文件",
        noRecent: "还没有最近打开的文件",
        starredHint: "给文件点一下星标，收藏的文件就会出现在这里。",
        recentHint: "打开过的文件会自动出现在这里。",
        emptyHint: "扫描 skill 产物或添加资料库，文件列表就会出现在这里",
        demoHint: "最小可见 demo：资料库 -> 扫描 -> 列表 -> 标签页 -> 查看 / 保存",
        welcomeHint: "左边扫描后点开任意 Markdown 或 HTML，就能看到第一版 demo 的主工作区。",
        fileTypeAll: "全部类型"
      },
      document: {
        file: "文件"
      },
      markdown: {
        outline: "文档大纲",
        expandOutline: "展开大纲",
        collapseOutline: "折叠大纲",
        opening: "正在打开 Markdown",
        openingBody: "正在读取并初始化编辑器，请稍等片刻。",
        openingPrefix: "正在打开 Markdown：",
        editorFailed: "Markdown 编辑器加载失败，已切换到源码编辑",
        editorFailedPrefix: "Markdown 编辑器加载失败：",
        editorFailedSuffix: "，已切换到源码编辑",
        dirty: "Markdown 有未保存修改，按 ⌘S 保存",
        editableHint: "可直接编辑 Markdown，修改后按 ⌘S 保存",
        loadingEditorStatus: "正在加载 Markdown 编辑器…",
        focused: "Markdown 编辑器已聚焦，可直接输入",
        ready: "Markdown 编辑器已就绪，可直接编辑",
        loadingEditor: "Markdown 编辑器还在加载，请稍后再试",
        saving: "正在保存 Markdown…",
        savedPrefix: "Markdown 已保存：",
        exportedPrefix: "已导出 Markdown：",
        codeLanguage: "代码块语言",
        formatTools: "文本格式工具",
        headingLevel: "标题层级",
        bold: "加粗",
        italic: "斜体",
        inlineCode: "行内代码",
        strike: "删除线",
        addLink: "添加超链接",
        removeLink: "取消超链接",
        linkTooltip: "超链",
        tableTools: "表格工具"
      },
      html: {
        controlsTitle: "Nutbook HTML 控制",
        fullscreenRequested: "已请求 HTML 全屏",
        fullscreenFailed: "HTML 全屏请求失败",
        presenterOpened: "已尝试打开 HTML 演讲者窗口",
        presenterBlocked: "HTML 演讲者窗口被拦截",
        commandPrefix: "收到 HTML 命令：",
        openedRuntimePrefix: "已打开 HTML Runtime：",
        tagMenuTitle: "自定义标签",
        newTagName: "新标签名",
        presentationExitHint: "再次按 F 退出全屏"
      },
      status: {
        codeCopied: "代码块已复制",
        codeCopyFailedPrefix: "复制代码失败：",
        externalLinksOnly: "当前只支持打开 http/https 网页链接",
        externalLinkOpened: "已在系统浏览器打开链接",
        linkImportNotFoundPrefix: "已尝试接入，但还没在列表中找到：",
        linkImportedPrefix: "已接入并打开：",
        unsupportedLinkType: "暂不支持这个链接类型",
        markdownHtmlLinksOnly: "当前只支持跳转 Markdown / HTML 文件链接",
        linkOpenCancelled: "已取消打开链接文件",
        linkOpenFailedPrefix: "打开链接失败：",
        installCommandCopied: "安装命令已复制，请在终端中运行",
        copyInstallCommandFailedPrefix: "复制安装命令失败：",
        preferencesSaved: "偏好设定已保存",
        languageUpdated: "界面语言已更新",
        languageUpdateFailedPrefix: "切换语言失败：",
        favoriteAdded: "已加入收藏",
        favoriteRemoved: "已取消收藏",
        favoriteFailedPrefix: "收藏失败：",
        scanRunning: "正在扫描资料库…",
        scanCompletePrefix: "扫描完成：",
        scanCompleteSuffix: "个文件",
        scanFailedPrefix: "扫描失败：",
        addLibraryFirst: "先接入一个资料库",
        fileLocationOpened: "已打开文件所在文件夹",
        listLoadFailedPrefix: "加载列表失败：",
        filesystemSyncedPrefix: "已同步本地文件变化：移除 ",
        filesystemSyncedMiddle: " 个失效文件，清理 ",
        filesystemSyncedSuffix: " 个已移除记录",
        filesystemSyncedSourcePrefix: "，清理 ",
        filesystemSyncedSourceSuffix: " 个失效单文件来源",
        filesystemSyncFailedPrefix: "同步本地文件状态失败：",
        thumbnailEngineDisabled: "未启用缩略图引擎，当前使用默认图标",
        thumbnailRefreshComplete: "缩略图刷新完成",
        thumbnailRebuildVisibleComplete: "已重建当前列表缩略图",
        thumbnailRebuildLibraryComplete: "已重建当前资料库的文档缩略图",
        thumbnailNoDocuments: "当前没有可重建的文档缩略图",
        thumbnailNoLibrary: "当前还没有选中资料库",
        thumbnailSystemChromeEnabled: "已启用系统 Chrome 截图",
        thumbnailSystemChromeDisabled: "已关闭系统 Chrome 截图",
        thumbnailEnableSystemChromeFailedPrefix: "启用系统 Chrome 截图失败：",
        thumbnailDisableSystemChromeFailedPrefix: "关闭系统 Chrome 截图失败：",
        thumbnailDetecting: "正在检测缩略图引擎…",
        thumbnailStatusRefreshed: "缩略图引擎状态已刷新",
        thumbnailChromeProgressPrefix: "正在调用 Chrome 截取文件缩略图：",
        thumbnailProgressPrefix: "缩略图",
        thumbnailProgressInfix: "中：",
        thumbnailRefreshMode: "刷新",
        thumbnailRebuildMode: "重建",
        openFileFailedPrefix: "打开文件失败：",
        itemRemovingPrefix: "正在移除：",
        itemRemovedPrefix: "已从 Nutbook 移除：",
        removeFailedPrefix: "移除失败：",
        movedToTrashPrefix: "已移到废纸篓：",
        moveToTrashFailedPrefix: "移到废纸篓失败：",
        chooseFileFirst: "先选一个文件",
        fillFolderFirst: "先填一个目录路径",
        fileConnectedPrefix: "已接入文件：",
        libraryConnectedPrefix: "已接入资料库：",
        fileConnectFailedPrefix: "接入文件失败：",
        folderConnectFailedPrefix: "接入目录失败：",
        tagAddedPrefix: "已新增标签：",
        tagDeleted: "标签已删除",
        customTagRemoved: "已移除自定义标签",
        customTagUpdated: "已更新自定义标签",
        typeFilterHtml: "已筛选 HTML 文件",
        typeFilterPrefix: "已筛选 ",
        typeFilterCleared: "已清除类型筛选",
        browseAll: "已切换到所有文件",
        browseRecent: "已切换到最近使用",
        browseStarred: "已切换到我的收藏",
        noFilesAddFirst: "当前没有文件，先添加文件夹再切换视图",
        gridView: "已切换为网格视图",
        listView: "已切换为列表视图",
        skillScanOpened: "已打开 Skill 产物扫描",
        skillRefreshStarted: "正在刷新 Skill 产物列表…",
        skillRefreshComplete: "Skill 产物列表已刷新",
        skillRefreshFailedPrefix: "刷新 Skill 产物列表失败：",
        skillRefreshingShort: "刷新中…",
        skillRefreshedShort: "已刷新",
        presentationEntered: "已进入演示模式",
        presentationExited: "已退出演示模式",
        presentationSwitchFailedPrefix: "演示模式切换失败：",
        hostFullscreenEntered: "宿主已处理 F 全屏",
        hostFullscreenExited: "宿主已退出 F 全屏",
        hostFullscreenFailed: "宿主 F 全屏失败"
      }
    },
    "en-US": {
      language: {
        name: "English",
        label: "Interface language",
        description: "Switch the language for NUTBOOK interface text, tips, and toolbars.",
        chinese: "简体中文",
        english: "English"
      },
      nav: {
        browse: "Browse",
        type: "Type",
        all: "All Files",
        recent: "Recent",
        starred: "Favorites",
        markdown: "Markdown",
        html: "HTML",
        settings: "Settings",
        thumbnailEngineDisabled: "Thumbnail engine is disabled"
      },
      actions: {
        addFolder: "Add Folder",
        addFile: "Add File",
        addSingleFile: "Add Single File",
        scanLibrary: "Scan Library",
        scanSkillOutputs: "Scan Skill Outputs",
        rescanLibrary: "Rescan Current Library",
        refresh: "Refresh",
        refreshList: "Refresh List",
        fillCurrentWorkspace: "Use Current Workspace",
        clearTabs: "Clear Tabs",
        toggleView: "Toggle View",
        sortFiles: "Sort Files",
        sortSources: "Sort Sources",
        favoriteFile: "Favorite File",
        unfavoriteFile: "Unfavorite File",
        favorite: "Favorite",
        removeFromNutbook: "Remove from Nutbook",
        removeFile: "Remove File",
        remove: "Remove",
        delete: "Delete",
        moreActions: "More Actions",
        save: "Save",
        export: "Export",
        index: "Show in Folder",
        scan: "Scan",
        restore: "Restore",
        restoreSelected: "Restore Selected",
        attach: "Connect",
        connected: "Connected",
        manualAttach: "Connect Manually",
        excluded: "Excluded",
        restoreVisible: "Show Again",
        excludeSelected: "Exclude Selected",
        detectEngine: "Detect Engine",
        rebuildVisible: "Rebuild Visible",
        rebuildLibrary: "Rebuild Library",
        copyInstallCommand: "Copy Install Command",
        enableSystemChrome: "Enable System Chrome Capture",
        disableSystemChrome: "Disable System Chrome Capture",
        closeSettings: "Close Settings",
        enterPresentation: "Presentation",
        enterPresentationShortcut: "Presentation (F)",
        exitPresentation: "Exit Presentation Mode",
        exitPresentationShortcut: "Exit Presentation Mode (F)",
        applyLink: "Apply Link",
        closeLinkInput: "Close Link Input",
        createTag: "Create Tag",
        addTag: "+ Tag"
      },
      settings: {
        title: "Settings",
        subtitle: "Manage libraries, tags, preferences, and the thumbnail engine",
        skills: "Skill Outputs",
        libraries: "File Sources",
        tags: "Tags",
        preferences: "Preferences",
        thumbnails: "Thumbnails",
        skillDescription: "This connects skill output folders. It does not install, enable, or run skills.",
        fileSources: "File Sources",
        removedFiles: "Removed Files",
        sourceSearchPlaceholder: "Search sources or paths...",
        tagsTitle: "Tag Management",
        preferencesTitle: "Preferences",
        preferencesDescription: "Manage Markdown reading and editing preferences. Outline navigation, code block themes, and table tools are controlled here.",
        thumbnailTitle: "Thumbnail Engine",
        sourceFolders: "Folder Sources",
        sourceFiles: "Single File Sources",
        sourceFoldersDescription: "Manage connected folder sources",
        sourceFilesDescription: "Manage individual files",
        ignoredDescription: "Restore files previously hidden from Nutbook",
        codeBlockTheme: "Code Block Theme",
        codeBlockThemeDescription: "Controls code block appearance in Markdown preview and editing modes.",
        darkCodeBlock: "Dark Code Blocks",
        lightCodeBlock: "Light Code Blocks",
        outline: "Document Outline",
        outlineDescription: "Generate left-side navigation from Markdown headings for quick jumps in long documents.",
        tableTools: "Enhanced Table Tools",
        tableToolsDescription: "Saves the preference for row and column table tools planned for later.",
        toggleOutline: "Toggle document outline",
        toggleTableTools: "Toggle enhanced table tools",
        autoCheckUpdates: "Automatically Check for Updates",
        autoCheckUpdatesDescription: "Automatically checks GitHub Releases and shows a sidebar logo hint when a new version is available.",
        updateCurrentVersion: "Current version",
        updateLatestVersion: "Latest version",
        updateLastChecked: "Last checked",
        updateAvailable: "New version available",
        updateCurrent: "You are on the latest version",
        updateChecking: "Checking for updates...",
        updateDisabled: "Automatic checks are off",
        updateSettingsLoadFailedPrefix: "Failed to load update settings: ",
        updateSettingsSaved: "Update preferences saved",
        updateSettingsSaveFailedPrefix: "Failed to save update preferences: ",
        updateFailedPrefix: "Check failed: ",
        updateNetworkUnavailable: "Network unavailable",
        updateUnavailable: "Version comparison is temporarily unavailable",
        updateChecked: "Updates checked",
        updateNotChecked: "Not checked yet",
        openRelease: "Open Release",
        openReleaseFailedPrefix: "Failed to open Release: ",
        screenshotEngine: "Capture Engine",
        currentPath: "Current Path",
        copySuccess: "Copied",
        noGroupContent: "No content in this group yet.",
        noRemovedFiles: "No removed files yet.",
        noLabels: "No tags yet.",
        noSkillReady: "No connectable skills in this group yet.",
        noSkillManual: "No skills require manual connection yet.",
        noSkillExcluded: "No excluded skills yet.",
        connectedOrReady: "Connected / Ready",
        manualSkill: "Manual Setup",
        excludedSkill: "Excluded",
        ready: "Ready",
        manualRequired: "Manual setup required",
        standardOutputMissing: "Standard output folder not detected",
        skillScanSummaryPrefix: "Scanned",
        skillScanSummaryMiddle: "skills, showing",
        skillScanSummarySuffix: "",
        folder: "Folder",
        singleFile: "Single File",
        removed: "Removed",
        sourcePrefix: "Source: ",
        duplicateSuffix: "copies",
        countSuffix: "",
        thumbnailStatusLoading: "Thumbnail engine status has not loaded yet.",
        thumbnailAvailable: "Available",
        thumbnailUnavailableDefault: "Not enabled. Using default icons.",
        thumbnailDefaultIcon: "Default icons",
        thumbnailSystemChrome: "System Chrome",
        thumbnailLocalChromium: "Local Chromium engine",
        thumbnailEngineAvailable: "Available thumbnail engine",
        thumbnailHeadlessMissing: "No Headless capture engine found",
        thumbnailIntro: "When the thumbnail engine is not running, NUTBOOK uses default SVG icons. Click Detect Engine to scan available system engines and follow the instructions if none are available.",
        thumbnailRebuildHint: "Rebuild Visible only processes files currently shown in the list. Rebuild Library processes all HTML / Markdown files in the current library.",
        thumbnailInstallHint: "Recommended: install Playwright Chromium as the capture engine. After installation, click Detect Engine again.",
        thumbnailInstallCommand: "Run this command in Terminal:",
        systemChromeHint: "Fallback: system Chrome was detected. You can enable it as a backup capture engine; NUTBOOK will call Chrome in the background and show progress in the status bar.",
        systemChromeSlowHint: "Large libraries may take a while to capture. This is normal.",
        systemChromeEnabledHint: "System Chrome is currently generating thumbnails. You can disable it at any time; NUTBOOK will continue using default icons."
      },
      sort: {
        modifiedAt: "Sort by Modified Time",
        fileName: "Sort by File Name",
        lastOpened: "Sort by Opened Time",
        tags: "Sort by Tags",
        name: "Sort by Name",
        path: "Sort by Path",
        kind: "Sort by Type",
        recentFirst: "Recently Added"
      },
      home: {
        searchPlaceholder: "Search files...",
        fileList: "File List",
        waitingScan: "Waiting for scan",
        bootLoadingTitle: "Loading library",
        bootLoadingBody: "Your file list will be ready in a moment.",
        noTabs: "No open tabs",
        noTabsHint: "Click All Files on the left to reopen Home, or open a file from your library.",
        openAFile: "Open a file first",
        noFiles: "No files yet",
        noStarred: "No favorites yet",
        noRecent: "No recent files yet",
        starredHint: "Star files and they will appear here.",
        recentHint: "Files you open will appear here automatically.",
        emptyHint: "Scan skill outputs or add a library to populate the file list.",
        demoHint: "Minimal demo: Library -> Scan -> List -> Tabs -> View / Save",
        welcomeHint: "Scan from the left, then open any Markdown or HTML file to see the first workspace view.",
        fileTypeAll: "All Types"
      },
      document: {
        file: "File"
      },
      markdown: {
        outline: "Document Outline",
        expandOutline: "Expand Outline",
        collapseOutline: "Collapse Outline",
        opening: "Opening Markdown",
        openingBody: "Reading the file and initializing the editor. Please wait a moment.",
        openingPrefix: "Opening Markdown: ",
        editorFailed: "Markdown editor failed to load. Switched to source editing.",
        editorFailedPrefix: "Markdown editor failed to load: ",
        editorFailedSuffix: ". Switched to source editing.",
        dirty: "Markdown has unsaved changes. Press ⌘S to save.",
        editableHint: "You can edit Markdown directly. Press ⌘S to save.",
        loadingEditorStatus: "Loading Markdown editor...",
        focused: "Markdown editor focused. You can type directly.",
        ready: "Markdown editor is ready. You can edit directly.",
        loadingEditor: "Markdown editor is still loading. Please try again shortly.",
        saving: "Saving Markdown...",
        savedPrefix: "Markdown saved: ",
        exportedPrefix: "Markdown exported: ",
        codeLanguage: "Code block language",
        formatTools: "Text formatting tools",
        headingLevel: "Heading level",
        bold: "Bold",
        italic: "Italic",
        inlineCode: "Inline Code",
        strike: "Strikethrough",
        addLink: "Add Link",
        removeLink: "Remove Link",
        linkTooltip: "Link",
        tableTools: "Table Tools"
      },
      html: {
        controlsTitle: "Nutbook HTML Controls",
        fullscreenRequested: "HTML fullscreen requested",
        fullscreenFailed: "HTML fullscreen request failed",
        presenterOpened: "Tried to open the HTML presenter window",
        presenterBlocked: "HTML presenter window was blocked",
        commandPrefix: "Received HTML command: ",
        openedRuntimePrefix: "Opened HTML Runtime: ",
        tagMenuTitle: "Custom Tag",
        newTagName: "New tag name",
        presentationExitHint: "Press F again to exit fullscreen"
      },
      status: {
        codeCopied: "Code block copied",
        codeCopyFailedPrefix: "Failed to copy code: ",
        externalLinksOnly: "Only http/https web links can be opened.",
        externalLinkOpened: "Opened link in the system browser",
        linkImportNotFoundPrefix: "Imported, but it was not found in the list yet: ",
        linkImportedPrefix: "Imported and opened: ",
        unsupportedLinkType: "This link type is not supported yet.",
        markdownHtmlLinksOnly: "Only Markdown / HTML file links can be opened.",
        linkOpenCancelled: "Opening linked file cancelled",
        linkOpenFailedPrefix: "Failed to open link: ",
        installCommandCopied: "Install command copied. Run it in Terminal.",
        copyInstallCommandFailedPrefix: "Failed to copy install command: ",
        preferencesSaved: "Preferences saved",
        languageUpdated: "Language updated",
        languageUpdateFailedPrefix: "Failed to switch language: ",
        favoriteAdded: "Added to favorites",
        favoriteRemoved: "Removed from favorites",
        favoriteFailedPrefix: "Favorite update failed: ",
        scanRunning: "Scanning library...",
        scanCompletePrefix: "Scan complete: ",
        scanCompleteSuffix: "files",
        scanFailedPrefix: "Scan failed: ",
        addLibraryFirst: "Add a library first",
        fileLocationOpened: "Opened file location",
        listLoadFailedPrefix: "Failed to load list: ",
        filesystemSyncedPrefix: "Synced local file changes: removed ",
        filesystemSyncedMiddle: " missing files, cleared ",
        filesystemSyncedSuffix: " removed records",
        filesystemSyncedSourcePrefix: ", removed ",
        filesystemSyncedSourceSuffix: " stale single-file sources",
        filesystemSyncFailedPrefix: "Failed to sync local file state: ",
        thumbnailEngineDisabled: "Thumbnail engine is disabled. Using default icons.",
        thumbnailRefreshComplete: "Thumbnail refresh complete",
        thumbnailRebuildVisibleComplete: "Rebuilt thumbnails for the current list",
        thumbnailRebuildLibraryComplete: "Rebuilt thumbnails for the current library",
        thumbnailNoDocuments: "No documents available for thumbnail rebuild",
        thumbnailNoLibrary: "No library selected yet",
        thumbnailSystemChromeEnabled: "System Chrome capture enabled",
        thumbnailSystemChromeDisabled: "System Chrome capture disabled",
        thumbnailEnableSystemChromeFailedPrefix: "Failed to enable System Chrome capture: ",
        thumbnailDisableSystemChromeFailedPrefix: "Failed to disable System Chrome capture: ",
        thumbnailDetecting: "Checking thumbnail engine...",
        thumbnailStatusRefreshed: "Thumbnail engine status refreshed",
        thumbnailChromeProgressPrefix: "Capturing thumbnails with Chrome: ",
        thumbnailProgressPrefix: "Thumbnail ",
        thumbnailProgressInfix: " in progress: ",
        thumbnailRefreshMode: "refresh",
        thumbnailRebuildMode: "rebuild",
        openFileFailedPrefix: "Failed to open file: ",
        itemRemovingPrefix: "Removing: ",
        itemRemovedPrefix: "Removed from Nutbook: ",
        removeFailedPrefix: "Remove failed: ",
        movedToTrashPrefix: "Moved to Trash: ",
        moveToTrashFailedPrefix: "Failed to move to Trash: ",
        chooseFileFirst: "Choose a file first",
        fillFolderFirst: "Enter a folder path first",
        fileConnectedPrefix: "File connected: ",
        libraryConnectedPrefix: "Library connected: ",
        fileConnectFailedPrefix: "Failed to connect file: ",
        folderConnectFailedPrefix: "Failed to connect folder: ",
        tagAddedPrefix: "Tag created: ",
        tagDeleted: "Tag deleted",
        customTagRemoved: "Custom tag removed",
        customTagUpdated: "Custom tag updated",
        typeFilterHtml: "Filtered HTML files",
        typeFilterPrefix: "Filtered ",
        typeFilterCleared: "Type filter cleared",
        browseAll: "Switched to All Files",
        browseRecent: "Switched to Recent",
        browseStarred: "Switched to Favorites",
        noFilesAddFirst: "No files yet. Add a folder before switching views.",
        gridView: "Switched to grid view",
        listView: "Switched to list view",
        skillScanOpened: "Opened skill output scanner",
        skillRefreshStarted: "Refreshing skill output list...",
        skillRefreshComplete: "Skill output list refreshed",
        skillRefreshFailedPrefix: "Failed to refresh skill output list: ",
        skillRefreshingShort: "Refreshing...",
        skillRefreshedShort: "Refreshed",
        presentationEntered: "Entered presentation mode",
        presentationExited: "Exited presentation mode",
        presentationSwitchFailedPrefix: "Failed to switch presentation mode: ",
        hostFullscreenEntered: "Host handled F fullscreen",
        hostFullscreenExited: "Host exited F fullscreen",
        hostFullscreenFailed: "Host F fullscreen failed"
      }
    }
  };

  const legacyTextKeys = {
    "所有文件": "nav.all",
    "浏览": "nav.browse",
    "类型": "nav.type",
    "最近使用": "nav.recent",
    "我的收藏": "nav.starred",
    "设置": "nav.settings",
    "缩略图引擎未启用": "nav.thumbnailEngineDisabled",
    "添加文件夹": "actions.addFolder",
    "添加文件": "actions.addFile",
    "添加单文件": "actions.addSingleFile",
    "扫描资料库": "actions.scanLibrary",
    "扫描skill 产物": "actions.scanSkillOutputs",
    "扫描 Skill 产物": "actions.scanSkillOutputs",
    "重新扫描当前资料库": "actions.rescanLibrary",
    "刷新": "actions.refresh",
    "刷新列表": "actions.refreshList",
    "填入当前工作区": "actions.fillCurrentWorkspace",
    "清空标签页": "actions.clearTabs",
    "切换视图": "actions.toggleView",
    "排序文件": "actions.sortFiles",
    "排序来源": "actions.sortSources",
    "收藏文件": "actions.favoriteFile",
    "收藏": "actions.favorite",
    "从 Nutbook 移除": "actions.removeFromNutbook",
    "移除文件": "actions.removeFile",
    "移除": "actions.remove",
    "删除": "actions.delete",
    "更多操作": "actions.moreActions",
    "保存": "actions.save",
    "导出": "actions.export",
    "索引": "actions.index",
    "扫描": "actions.scan",
    "恢复": "actions.restore",
    "批量恢复": "actions.restoreSelected",
    "接入": "actions.attach",
    "已接入": "actions.connected",
    "手动接入": "actions.manualAttach",
    "已排除": "actions.excluded",
    "恢复显示": "actions.restoreVisible",
    "批量排除": "actions.excludeSelected",
    "检测引擎": "actions.detectEngine",
    "重建可见文件": "actions.rebuildVisible",
    "重建资料库": "actions.rebuildLibrary",
    "复制安装命令": "actions.copyInstallCommand",
    "启用系统 Chrome 截图": "actions.enableSystemChrome",
    "关闭系统 Chrome 截图": "actions.disableSystemChrome",
    "关闭设置": "actions.closeSettings",
    "演示模式全屏": "actions.enterPresentation",
    "退出演示模式": "actions.exitPresentation",
    "新增标签": "actions.createTag",
    "+ 标签": "actions.addTag",
    "Skill 接入": "settings.skills",
    "文件管理": "settings.libraries",
    "标签管理": "settings.tags",
    "偏好设定": "settings.preferences",
    "缩略图": "settings.thumbnails",
    "管理资料库、标签、偏好和缩略图引擎": "settings.subtitle",
    "这里接入的是 skill 生成产物目录，不是安装、启用或运行 skill 本身。": "settings.skillDescription",
    "文件来源": "settings.fileSources",
    "已移除文件": "settings.removedFiles",
    "搜索来源或路径...": "settings.sourceSearchPlaceholder",
    "管理 Markdown 阅读与编辑相关偏好，后续的大纲导航、代码块主题和表格工具都会从这里控制。": "settings.preferencesDescription",
    "缩略图引擎": "settings.thumbnailTitle",
    "代码块主题": "settings.codeBlockTheme",
    "控制 Markdown 预览和编辑态里的代码块外观。": "settings.codeBlockThemeDescription",
    "深色代码块": "settings.darkCodeBlock",
    "浅色代码块": "settings.lightCodeBlock",
    "文档大纲导航": "settings.outline",
    "根据 Markdown 标题生成左侧导航，适合快速跳转长文档结构。": "settings.outlineDescription",
    "表格增强工具": "settings.tableTools",
    "后续用于表格行列增删工具；当前先保存开关偏好。": "settings.tableToolsDescription",
    "自动检查更新": "settings.autoCheckUpdates",
    "自动检查 GitHub Releases，有新版本时在侧栏 logo 旁提示。": "settings.autoCheckUpdatesDescription",
    "当前版本": "settings.updateCurrentVersion",
    "最新版本": "settings.updateLatestVersion",
    "上次检查": "settings.updateLastChecked",
    "有新版本可用": "settings.updateAvailable",
    "当前已是最新版本": "settings.updateCurrent",
    "正在检查更新...": "settings.updateChecking",
    "自动检查已关闭": "settings.updateDisabled",
    "读取更新设置失败：": "settings.updateSettingsLoadFailedPrefix",
    "更新偏好已保存": "settings.updateSettingsSaved",
    "保存更新偏好失败：": "settings.updateSettingsSaveFailedPrefix",
    "检查失败：": "settings.updateFailedPrefix",
    "网络不可用": "settings.updateNetworkUnavailable",
    "暂时无法比较版本": "settings.updateUnavailable",
    "已检查更新": "settings.updateChecked",
    "尚未检查": "settings.updateNotChecked",
    "打开 Release": "settings.openRelease",
    "打开 Release 失败：": "settings.openReleaseFailedPrefix",
    "界面语言": "language.label",
    "文件夹来源": "settings.sourceFolders",
    "单文件来源": "settings.sourceFiles",
    "管理已接入的文件夹来源": "settings.sourceFoldersDescription",
    "管理单独接入的文件": "settings.sourceFilesDescription",
    "恢复之前从 Nutbook 隐藏的文件": "settings.ignoredDescription",
    "单文件": "settings.singleFile",
    "文件夹": "settings.folder",
    "已移除": "settings.removed",
    "这一组里还没有内容。": "settings.noGroupContent",
    "还没有已移除文件。": "settings.noRemovedFiles",
    "还没有标签。": "settings.noLabels",
    "已接入 / 可接入": "settings.connectedOrReady",
    "待手动接入": "settings.manualSkill",
    "可接入": "settings.ready",
    "需手动接入": "settings.manualRequired",
    "未识别标准输出目录": "settings.standardOutputMissing",
    "可用": "settings.thumbnailAvailable",
    "未启用，当前使用默认图标": "settings.thumbnailUnavailableDefault",
    "文件": "document.file",
    "这一组里还没有可接入的 skill。": "settings.noSkillReady",
    "这一组里还没有需要手动接入的 skill。": "settings.noSkillManual",
    "还没有已排除的 skill。": "settings.noSkillExcluded",
    "截图引擎": "settings.screenshotEngine",
    "当前路径": "settings.currentPath",
    "复制成功": "settings.copySuccess",
    "缩略图引擎状态还没加载出来。": "settings.thumbnailStatusLoading",
    "等待扫描": "home.waitingScan",
    "搜索文件...": "home.searchPlaceholder",
    "文件列表": "home.fileList",
    "没有打开的标签页": "home.noTabs",
    "点击左侧“所有文件”重新打开首页，或从资料库中打开一个文件。": "home.noTabsHint",
    "先打开一个文件": "home.openAFile",
    "还没有文件": "home.noFiles",
    "还没有收藏文件": "home.noStarred",
    "还没有最近打开的文件": "home.noRecent",
    "给文件点一下星标，收藏的文件就会出现在这里。": "home.starredHint",
    "打开过的文件会自动出现在这里。": "home.recentHint",
    "扫描 skill 产物或添加资料库，文件列表就会出现在这里": "home.emptyHint",
    "最小可见 demo：资料库 -> 扫描 -> 列表 -> 标签页 -> 查看 / 保存": "home.demoHint",
    "左边扫描后点开任意 Markdown 或 HTML，就能看到第一版 demo 的主工作区。": "home.welcomeHint",
    "全部类型": "home.fileTypeAll",
    "按修改时间": "sort.modifiedAt",
    "按文件名": "sort.fileName",
    "按打开时间": "sort.lastOpened",
    "按标签": "sort.tags",
    "按名称": "sort.name",
    "按路径": "sort.path",
    "按类型": "sort.kind",
    "最近添加": "sort.recentFirst",
    "文档大纲": "markdown.outline",
    "展开大纲": "markdown.expandOutline",
    "折叠大纲": "markdown.collapseOutline",
    "正在打开 Markdown": "markdown.opening",
    "正在读取并初始化编辑器，请稍等片刻。": "markdown.openingBody",
    "正在加载 Markdown 编辑器…": "markdown.loadingEditorStatus",
    "Markdown 编辑器加载失败，已切换到源码编辑": "markdown.editorFailed",
    "Markdown 有未保存修改，按 ⌘S 保存": "markdown.dirty",
    "可直接编辑 Markdown，修改后按 ⌘S 保存": "markdown.editableHint",
    "Markdown 编辑器已聚焦，可直接输入": "markdown.focused",
    "Markdown 编辑器已就绪，可直接编辑": "markdown.ready",
    "Markdown 编辑器还在加载，请稍后再试": "markdown.loadingEditor",
    "正在保存 Markdown…": "markdown.saving",
    "代码块语言": "markdown.codeLanguage",
    "文本格式工具": "markdown.formatTools",
    "标题层级": "markdown.headingLevel",
    "加粗": "markdown.bold",
    "斜体": "markdown.italic",
    "行内代码": "markdown.inlineCode",
    "删除线": "markdown.strike",
    "添加超链接": "markdown.addLink",
    "取消超链接": "markdown.removeLink",
    "超链": "markdown.linkTooltip",
    "表格工具": "markdown.tableTools",
    "Nutbook HTML 控制": "html.controlsTitle",
    "收藏文件": "actions.favoriteFile",
    "自定义标签": "html.tagMenuTitle",
    "新标签名": "html.newTagName",
    "按修改时间": "sort.modifiedAt"
  };

  const lookup = (key, language = currentLanguage()) => {
    const read = (lang) => key.split(".").reduce((value, part) => value?.[part], translations[lang]);
    return read(language) ?? read(FALLBACK_LANGUAGE) ?? key;
  };

  const buildValueKeyMap = () => {
    const map = new Map();
    const walk = (value, prefix = "") => {
      if (!value || typeof value !== "object" || Array.isArray(value)) {
        if (typeof value === "string" && prefix) map.set(value, prefix);
        return;
      }
      Object.entries(value).forEach(([key, child]) => walk(child, prefix ? `${prefix}.${key}` : key));
    };
    Object.values(translations).forEach((locale) => walk(locale));
    Object.entries(legacyTextKeys).forEach(([text, key]) => map.set(text, key));
    return map;
  };

  const valueKeyMap = buildValueKeyMap();

  function normalizeLanguage(language) {
    return supportedLanguages.includes(language) ? language : DEFAULT_LANGUAGE;
  }

  function currentLanguage() {
    try {
      return normalizeLanguage(window.localStorage?.getItem(STORAGE_KEY) || DEFAULT_LANGUAGE);
    } catch (_) {
      return DEFAULT_LANGUAGE;
    }
  }

  function setLanguage(language) {
    const normalized = normalizeLanguage(language);
    try {
      window.localStorage?.setItem(STORAGE_KEY, normalized);
    } catch (_) {
    }
    apply(document);
    window.dispatchEvent(new CustomEvent("nutbook:language-change", { detail: { language: normalized } }));
    return normalized;
  }

  function translateText(text, language = currentLanguage()) {
    const key = valueKeyMap.get(text);
    return key ? lookup(key, language) : text;
  }

  function translateTextNode(node, language) {
    const text = node.nodeValue;
    const trimmed = text.trim();
    if (!trimmed) return;
    const translated = translateText(trimmed, language);
    if (translated === trimmed) return;
    node.nodeValue = text.replace(trimmed, translated);
  }

  function shouldSkipElement(element) {
    return Boolean(element.closest?.([
      "script",
      "style",
      "code",
      "pre",
      ".markdown-preview",
      ".ProseMirror",
      ".markdown-editor-root",
      ".markdown-source",
      "[data-i18n-skip]",
      ".item-card",
      ".tab-chip",
      ".library-card",
      ".settings-row-title",
      ".settings-row-path"
    ].join(",")));
  }

  function setAttributeIfChanged(element, attribute, value) {
    if (element.getAttribute(attribute) === value) return;
    element.setAttribute(attribute, value);
  }

  function translateAttributes(element, language) {
    if (element.hasAttribute?.("data-i18n-key")) {
      const text = lookup(element.getAttribute("data-i18n-key"), language);
      if (element.textContent !== text) element.textContent = text;
    }
    if (element.hasAttribute?.("data-i18n-placeholder")) {
      setAttributeIfChanged(element, "placeholder", lookup(element.getAttribute("data-i18n-placeholder"), language));
    }
    if (element.hasAttribute?.("data-i18n-aria-label")) {
      setAttributeIfChanged(element, "aria-label", lookup(element.getAttribute("data-i18n-aria-label"), language));
    }
    if (element.hasAttribute?.("data-i18n-title")) {
      setAttributeIfChanged(element, "title", lookup(element.getAttribute("data-i18n-title"), language));
    }
    ["aria-label", "placeholder", "title", "value"].forEach((attribute) => {
      if (!element.hasAttribute?.(attribute)) return;
      if (attribute === "value" && element.matches?.("input, textarea")) return;
      const value = element.getAttribute(attribute);
      const translated = translateText(value, language);
      if (translated !== value) {
        setAttributeIfChanged(element, attribute, translated);
      }
    });
  }

  function apply(root = document) {
    if (!root) return;
    const language = currentLanguage();
    document?.documentElement?.setAttribute("lang", language);
    const walkerRoot = root.nodeType === Node.DOCUMENT_NODE ? root.body || root.documentElement : root;
    if (!walkerRoot) return;
    if (walkerRoot.nodeType === Node.ELEMENT_NODE && !shouldSkipElement(walkerRoot)) {
      translateAttributes(walkerRoot, language);
    }
    const walker = document.createTreeWalker(walkerRoot, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    let node = walker.currentNode;
    while (node) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        if (!shouldSkipElement(node)) translateAttributes(node, language);
      } else if (node.nodeType === Node.TEXT_NODE) {
        const parent = node.parentElement;
        if (parent && !shouldSkipElement(parent)) translateTextNode(node, language);
      }
      node = walker.nextNode();
    }
  }

  let observer = null;
  function observe() {
    if (observer || !document?.body) return;
    observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE) {
            apply(node.nodeType === Node.TEXT_NODE ? node.parentElement : node);
          }
        });
        if (mutation.type === "attributes") {
          apply(mutation.target);
        }
      }
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["aria-label", "placeholder", "title", "value"]
    });
    apply(document);
  }

  window.NutbookI18n = {
    STORAGE_KEY,
    DEFAULT_LANGUAGE,
    supportedLanguages,
    translations,
    legacyTextKeys,
    lookup,
    currentLanguage,
    setLanguage,
    translateText,
    apply,
    observe
  };
})();
