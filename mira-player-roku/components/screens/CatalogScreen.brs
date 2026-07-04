sub init()
    m.categoryList = m.top.FindNode("categoryList")
    m.posterGrid = m.top.FindNode("posterGrid")
    m.stateLabel = m.top.FindNode("stateLabel")
    m.spinner = m.top.FindNode("spinner")
    m.headerTitle = m.top.FindNode("headerTitle")
    m.sortLabel = m.top.FindNode("sortLabel")

    m.categories = []
    m.allItems = []
    m.filteredItems = []
    m.currentCategoryId = ""
    m.panelFocus = "categories"
    m.pendingAction = ""
    m.searchTerm = ""
    m.sortMode = "default"
    m.pageSize = 50
    m.loadedCount = 0
    m.searchDialog = invalid

    m.task = CreateObject("roSGNode", "XtreamTask")
    m.task.ObserveField("response", "onResponse")

    m.categoryList.ObserveField("itemFocused", "onCategoryFocused")
    m.categoryList.ObserveField("itemSelected", "onCategorySelected")
    m.posterGrid.ObserveField("itemSelected", "onItemSelected")
    m.posterGrid.ObserveField("itemFocused", "onGridItemFocused")
    m.top.ObserveField("focusedChild", "onFocusChanged")
end sub

sub onFocusChanged()
    if not m.top.IsInFocusChain() then return
    restorePanelFocus()
end sub

sub restorePanelFocus()
    if m.panelFocus = "grid"
        if not m.posterGrid.IsInFocusChain() then m.posterGrid.SetFocus(true)
    else
        if not m.categoryList.IsInFocusChain() then m.categoryList.SetFocus(true)
    end if
end sub

function getScene() as Object
    node = m.top.getParent()
    while node <> invalid
        if node.isSubtype("Scene") then return node
        node = node.getParent()
    end while
    return invalid
end function

sub onCredentialsSet()
    if m.top.credentials = invalid then return
    m.task.credentials = m.top.credentials
    setupForType()
end sub

sub setupForType()
    tipo = m.top.contentType
    m.headerTitle.text = m.top.sectionTitle
    m.stateLabel.text = "Cargando categorías…"
    m.stateLabel.visible = true
    m.spinner.visible = true

    saved = LoadBrowseState(tipo)
    if saved.sort <> "" then m.sortMode = saved.sort
    m.savedCategoryId = saved.category
    updateSortLabel()

    if tipo = "movie"
        m.pendingAction = "categories"
        m.catAction = "get_vod_categories"
        m.itemAction = "get_vod_streams"
        m.task.request = {action: "get_vod_categories"}
    else
        m.pendingAction = "categories"
        m.catAction = "get_series_categories"
        m.itemAction = "get_series"
        m.task.request = {action: "get_series_categories"}
    end if
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
    else if m.pendingAction = "items"
        buildGrid(response.data)
    end if
end sub

sub buildCategoryList(data as Object)
    visibleCats = []
    for each cat in data
        if not BlockedByParental(SafeStr(cat["category_name"]))
            visibleCats.Push(cat)
        end if
    end for
    visibleCats = ApplyCategoryOrder(visibleCats, LoadCategoryOrder(m.top.contentType))

    m.categories = [{category_id: "", category_name: "Todas"}]
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
        loadItems("")
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

sub loadItems(categoryId as String)
    m.currentCategoryId = categoryId
    m.searchTerm = ""
    m.spinner.visible = true
    m.pendingAction = "items"

    req = {action: m.itemAction}
    if categoryId <> ""
        req.category_id = categoryId
    end if
    m.task.request = req
end sub

sub buildGrid(data as Object)
    m.allItems = data
    applyFilterAndSort()
end sub

sub applyFilterAndSort()
    if m.searchTerm = ""
        filtered = m.allItems
    else
        filtered = []
        term = lcase(m.searchTerm)
        for each item in m.allItems
            name = lcase(SafeStr(item["name"]))
            if instr(name, term) > 0
                filtered.Push(item)
            end if
        end for
    end if

    if m.sortMode = "az"
        filtered = sortByName(filtered, true)
    else if m.sortMode = "za"
        filtered = sortByName(filtered, false)
    end if

    m.filteredItems = filtered
    m.loadedCount = 0
    renderPage()
end sub

sub renderPage()
    if m.loadedCount = 0
        content = CreateObject("roSGNode", "ContentNode")
    else
        content = m.posterGrid.content
        if content = invalid
            content = CreateObject("roSGNode", "ContentNode")
        end if
    end if

    total = m.filteredItems.Count()
    endIdx = m.loadedCount + m.pageSize - 1
    if endIdx >= total then endIdx = total - 1

    i = m.loadedCount
    while i <= endIdx
        item = m.filteredItems[i]
        node = CreateObject("roSGNode", "ContentNode")
        node.title = CleanText(SafeStr(item["name"]))
        node.HDPosterUrl = SafeStr(item["stream_icon"])
        if node.HDPosterUrl = "" and item.DoesExist("cover")
            node.HDPosterUrl = SafeStr(item["cover"])
        end if
        content.AppendChild(node)
        i = i + 1
    end while

    m.loadedCount = endIdx + 1
    m.posterGrid.content = content

    if total = 0
        if m.searchTerm <> ""
            m.stateLabel.text = "Sin resultados para '" + m.searchTerm + "'."
        else
            m.stateLabel.text = "Sin contenido en esta categoría."
        end if
        m.stateLabel.visible = true
    else
        m.stateLabel.visible = false
    end if
end sub

sub onGridItemFocused(event as Object)
    idx = event.GetData()
    if idx < 0 then return
    if idx >= m.loadedCount - 10 and m.loadedCount < m.filteredItems.Count()
        renderPage()
    end if
end sub

sub onCategoryFocused(event as Object)
    idx = event.GetData()
    if idx < 0 or idx >= m.categories.Count() then return
    cat = m.categories[idx]
    categoryId = SafeStr(cat["category_id"])
    if categoryId <> m.currentCategoryId
        loadItems(categoryId)
        SaveBrowseState(m.top.contentType, categoryId, m.sortMode)
    end if
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
    SaveCategoryOrder(m.top.contentType, ids)

    renderCategoryList()
    m.categoryList.jumpToItem = target
    m.categoryList.SetFocus(true)
end sub

sub onCategorySelected(event as Object)
    m.panelFocus = "grid"
    m.posterGrid.SetFocus(true)
end sub

sub onItemSelected(event as Object)
    idx = event.GetData()
    if m.filteredItems = invalid or m.filteredItems.Count() = 0 then return
    if idx < 0 or idx >= m.filteredItems.Count() then return
    item = m.filteredItems[idx]
    creds = m.top.credentials

    if m.top.contentType = "movie"
        m.top.navigate = {
            screen: "DetailScreen",
            params: {credentials: creds, contentData: item, contentType: "movie"}
        }
    else
        m.top.navigate = {
            screen: "DetailScreen",
            params: {credentials: creds, contentData: item, contentType: "series"}
        }
    end if
end sub

sub showSearch()
    scene = getScene()
    if scene = invalid then return
    dialog = CreateObject("roSGNode", "StandardKeyboardDialog")
    dialog.title = "Buscar"
    dialog.buttons = ["Buscar", "Limpiar", "Cancelar"]
    if m.searchTerm <> ""
        dialog.textEditBox.text = m.searchTerm
    end if
    scene.dialog = dialog
    dialog.ObserveField("buttonSelected", "onSearchButton")
    m.searchDialog = dialog
end sub

sub onSearchButton()
    dialog = m.searchDialog
    if dialog = invalid then return
    btnIdx = dialog.buttonSelected
    if btnIdx = 0
        m.searchTerm = dialog.textEditBox.text
    else if btnIdx = 1
        m.searchTerm = ""
    end if
    scene = getScene()
    if scene <> invalid then scene.dialog = invalid
    m.searchDialog = invalid
    applyFilterAndSort()
    restorePanelFocus()
end sub

sub toggleSort()
    if m.sortMode = "default"
        m.sortMode = "az"
    else if m.sortMode = "az"
        m.sortMode = "za"
    else
        m.sortMode = "default"
    end if
    updateSortLabel()
    SaveBrowseState(m.top.contentType, m.currentCategoryId, m.sortMode)
    applyFilterAndSort()
end sub

sub updateSortLabel()
    if m.sortMode = "az"
        m.sortLabel.text = "A-Z"
    else if m.sortMode = "za"
        m.sortLabel.text = "Z-A"
    else
        m.sortLabel.text = "Por defecto"
    end if
end sub

function sortByName(arr as Object, ascending as Boolean) as Object
    n = arr.Count()
    if n <= 1 then return arr
    result = []
    for each item in arr
        result.Push(item)
    end for
    qsort(result, 0, n - 1, ascending)
    return result
end function

sub qsort(arr as Object, lo as Integer, hi as Integer, asc as Boolean)
    if lo >= hi then return
    p = qpartition(arr, lo, hi, asc)
    qsort(arr, lo, p - 1, asc)
    qsort(arr, p + 1, hi, asc)
end sub

function qpartition(arr as Object, lo as Integer, hi as Integer, asc as Boolean) as Integer
    pivot = lcase(SafeStr(arr[hi]["name"]))
    i = lo - 1
    j = lo
    while j < hi
        val = lcase(SafeStr(arr[j]["name"]))
        swap = false
        if asc and val <= pivot then swap = true
        if not asc and val >= pivot then swap = true
        if swap
            i = i + 1
            tmp = arr[i]
            arr[i] = arr[j]
            arr[j] = tmp
        end if
        j = j + 1
    end while
    tmp = arr[i + 1]
    arr[i + 1] = arr[hi]
    arr[hi] = tmp
    return i + 1
end function

function onKeyEvent(key as String, press as Boolean) as Boolean
    if not press then return false

    if key = "back"
        if m.panelFocus = "grid"
            m.panelFocus = "categories"
            m.categoryList.SetFocus(true)
            return true
        end if
        m.top.navigate = {screen: "back", params: {}}
        return true
    end if

    if key = "search" or key = "green"
        showSearch()
        return true
    end if

    if key = "options"
        toggleSort()
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
