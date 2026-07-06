sub init()
    m.profileList = m.top.FindNode("profileList")
    m.profileList.ObserveField("itemSelected", "onProfileSelected")
    m.top.ObserveField("focusedChild", "onFocusChanged")

    refreshProfileList()
    m.profileList.SetFocus(true)
end sub

sub onFocusChanged()
    if not m.top.IsInFocusChain() then return
    if not m.profileList.IsInFocusChain() then m.profileList.SetFocus(true)
end sub

sub refreshProfileList()
    m.profiles = LoadProfiles()
    m.activeId = GetActiveProfileId()

    content = CreateObject("roSGNode", "ContentNode")
    for each p in m.profiles
        row = CreateObject("roSGNode", "ContentNode")
        label = SafeStr(p["nombre"])
        if SafeStr(p["id"]) = m.activeId then label = label + "  (activo)"
        row.title = label
        content.AppendChild(row)
    end for

    addRow = CreateObject("roSGNode", "ContentNode")
    addRow.title = "+ Nuevo perfil"
    content.AppendChild(addRow)

    m.profileList.content = content
end sub

sub onProfileSelected(event as Object)
    idx = event.GetData()
    if m.profiles = invalid then return

    if idx >= m.profiles.Count()
        showAddDialog()
        return
    end if
    if idx < 0 then return

    p = m.profiles[idx]
    pid = SafeStr(p["id"])
    if pid = m.activeId then return

    SetActiveProfileId(pid)
    RunSync(m.top)
    refreshProfileList()
end sub

sub showAddDialog()
    kb = CreateObject("roSGNode", "StandardKeyboardDialog")
    kb.title = "Nombre del perfil"
    kb.text = ""
    kb.ObserveField("wasClosed", "onAddClosed")
    m.activeKb = kb
    m.top.GetScene().Dialog = kb
end sub

sub onAddClosed()
    if m.activeKb = invalid then return
    text = m.activeKb.text
    m.activeKb = invalid

    if text <> ""
        di = CreateObject("roDeviceInfo")
        id = di.GetRandomUUID()
        UpsertProfile(id, text)
        SetActiveProfileId(id)
        RunSync(m.top)
        refreshProfileList()
    end if

    m.profileList.SetFocus(true)
end sub

function onKeyEvent(key as String, press as Boolean) as Boolean
    if not press then return false

    if key = "back"
        m.top.navigate = {screen: "back", params: {}}
        return true
    end if

    return false
end function
