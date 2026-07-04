sub init()
    m.categoryList = m.top.FindNode("categoryList")
    m.channelList = m.top.FindNode("channelList")
    m.stateLabel = m.top.FindNode("stateLabel")
    m.spinner = m.top.FindNode("spinner")

    m.categories = []
    m.channelsByCategory = {}
    m.currentCategoryId = ""
    m.panelFocus = "categories"

    m.task = CreateObject("roSGNode", "XtreamTask")
    m.task.ObserveField("response", "onResponse")

    m.categoryList.ObserveField("itemFocused", "onCategoryFocused")
    m.categoryList.ObserveField("itemSelected", "onCategorySelected")
    m.channelList.ObserveField("itemSelected", "onChannelSelected")
    m.top.ObserveField("focusedChild", "onFocusChanged")
end sub

sub onFocusChanged()
    if not m.top.IsInFocusChain() then return
    if m.panelFocus = "channels"
        if not m.channelList.IsInFocusChain() then m.channelList.SetFocus(true)
    else
        if not m.categoryList.IsInFocusChain() then m.categoryList.SetFocus(true)
    end if
end sub

sub onCredentialsSet()
    if m.top.credentials = invalid then return
    m.task.credentials = m.top.credentials
    saved = LoadBrowseState("live")
    m.savedCategoryId = saved.category
    m.pendingAction = "categories"
    m.task.request = {action: "get_live_categories"}
end sub

sub onResponse()
    response = m.task.response
    m.spinner.visible = false

    if not response.success
        m.stateLabel.text = "Error: " + response.error
        m.stateLabel.visible = true
        return
    end if

    if m.pendingAction = "categories"
        m.stateLabel.visible = false
        buildCategoryList(response.data)
    else if m.pendingAction = "channels"
        buildChannelList(response.data)
    end if
end sub

sub buildCategoryList(data as Object)
    visibleCats = []
    for each cat in data
        if not BlockedByParental(SafeStr(cat["category_name"]))
            visibleCats.Push(cat)
        end if
    end for
    visibleCats = ApplyCategoryOrder(visibleCats, LoadCategoryOrder("live"))

    m.categories = [{category_id: "", category_name: "Todos"}]
    for each cat in visibleCats
        m.categories.Push(cat)
    end for

    renderCategoryList()
    m.categoryList.SetFocus(true)

    restoreIdx = 0
    if m.savedCategoryId <> invalid and m.savedCategoryId <> ""
        i = 0
        for each cat in m.categories
            if SafeStr(cat["category_id"]) = m.savedCategoryId then restoreIdx = i
            i = i + 1
        end for
    end if

    if restoreIdx > 0
        m.categoryList.jumpToItem = restoreIdx
    else
        loadChannels("")
    end if
end sub

sub renderCategoryList()
    content = CreateObject("roSGNode", "ContentNode")
    for each cat in m.categories
        row = CreateObject("roSGNode", "ContentNode")
        row.title = "  " + CleanText(SafeStr(cat["category_name"]))
        content.AppendChild(row)
    end for
    m.categoryList.content = content
end sub

sub moveCategory(direction as Integer)
    if m.panelFocus <> "categories" then return
    idx = m.categoryList.itemFocused
    if idx <= 0 then return
    target = idx + direction
    if target <= 0 or target >= m.categories.Count() then return

    tmp = m.categories[idx]
    m.categories[idx] = m.categories[target]
    m.categories[target] = tmp

    ids = []
    i = 1
    while i < m.categories.Count()
        ids.Push(SafeStr(m.categories[i]["category_id"]))
        i = i + 1
    end while
    SaveCategoryOrder("live", ids)

    renderCategoryList()
    m.categoryList.jumpToItem = target
    m.categoryList.SetFocus(true)
end sub

sub loadChannels(categoryId as String)
    m.currentCategoryId = categoryId
    m.spinner.visible = true
    m.pendingAction = "channels"

    req = {action: "get_live_streams"}
    if categoryId <> ""
        req.category_id = categoryId
    end if
    m.task.request = req
end sub

sub buildChannelList(data as Object)
    m.currentChannels = data
    content = CreateObject("roSGNode", "ContentNode")
    for each ch in data
        row = CreateObject("roSGNode", "ContentNode")
        row.title = "  " + CleanText(SafeStr(ch["name"]))
        content.AppendChild(row)
    end for
    m.channelList.content = content

    if data.Count() = 0
        m.stateLabel.text = "Sin canales en esta categoría."
        m.stateLabel.visible = true
    else
        m.stateLabel.visible = false
    end if
end sub

sub onCategoryFocused(event as Object)
    idx = event.GetData()
    if idx < 0 or idx >= m.categories.Count() then return
    cat = m.categories[idx]
    categoryId = SafeStr(cat["category_id"])
    if categoryId <> m.currentCategoryId
        loadChannels(categoryId)
        SaveBrowseState("live", categoryId, "")
    end if
end sub

sub onCategorySelected(event as Object)
    m.panelFocus = "channels"
    m.channelList.SetFocus(true)
end sub

sub onChannelSelected(event as Object)
    idx = event.GetData()
    if m.currentChannels = invalid then return
    ch = m.currentChannels[idx]
    creds = m.top.credentials
    streamId = SafeStr(ch["stream_id"])
    url = LiveStreamUrl(creds.server, creds.username, creds.password, streamId)
    m.top.navigate = {
        screen: "PlayerScreen",
        params: {streamUrl: url, contentTitle: SafeStr(ch["name"]), credentials: creds}
    }
end sub

function onKeyEvent(key as String, press as Boolean) as Boolean
    if not press then return false

    if key = "back"
        if m.panelFocus = "channels"
            m.panelFocus = "categories"
            m.categoryList.SetFocus(true)
            return true
        end if
        m.top.navigate = {screen: "back", params: {}}
        return true
    end if

    if key = "rewind"
        moveCategory(-1)
        return true
    end if

    if key = "fastForward"
        moveCategory(1)
        return true
    end if

    return false
end function
