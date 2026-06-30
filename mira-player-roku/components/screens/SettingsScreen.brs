sub init()
    m.serverInfo = m.top.FindNode("serverInfo")
    m.userInfo = m.top.FindNode("userInfo")
    m.expiryInfo = m.top.FindNode("expiryInfo")
    m.statusInfo = m.top.FindNode("statusInfo")
    m.logoutBtn = m.top.FindNode("logoutBtn")
    m.spinner = m.top.FindNode("spinner")
    m.stateLabel = m.top.FindNode("stateLabel")

    m.focusIndex = 0

    m.task = CreateObject("roSGNode", "XtreamTask")
    m.task.ObserveField("response", "onAccountInfo")

    updateFocus()
    loadAccount()
end sub

sub loadAccount()
    creds = LoadCredentials()
    if creds = invalid
        m.stateLabel.text = "No hay cuenta guardada."
        return
    end if

    m.serverInfo.text = "Servidor: " + SafeStr(creds.server)
    m.userInfo.text = "Usuario: " + SafeStr(creds.username)

    m.task.credentials = creds
    m.task.request = {action: "authenticate"}
end sub

sub onAccountInfo()
    m.spinner.visible = false
    m.stateLabel.visible = false
    response = m.task.response

    if not response.success
        m.stateLabel.text = "No se pudo cargar la información."
        m.stateLabel.visible = true
        return
    end if

    userInfo = response.data["user_info"]
    if userInfo = invalid then return

    status = SafeStr(userInfo["status"])
    expiry = SafeStr(userInfo["exp_date"])
    maxConn = SafeStr(userInfo["max_connections"])

    m.statusInfo.text = "Estado: " + iif(status = "Active", "Activa", status)
    m.statusInfo.color = iif(status = "Active", "0x55FF55FF", "0xFF5555FF")

    if expiry <> "" and expiry <> "0"
        ts = expiry.ToInt()
        dt = CreateObject("roDateTime")
        dt.FromSeconds(ts)
        m.expiryInfo.text = "Expira: " + dt.AsDateString("short-date")
    else
        m.expiryInfo.text = "Expira: Sin vencimiento"
    end if

    if maxConn <> ""
        m.userInfo.text = m.userInfo.text + "  ·  Conexiones: " + maxConn
    end if
end sub

sub updateFocus()
    m.logoutBtn.color = iif(m.focusIndex = 0, "0x3A1A1AFF", "0x2A2A2AFF")
end sub

function onKeyEvent(key as String, press as Boolean) as Boolean
    if not press then return false

    if key = "back"
        m.top.navigate = {screen: "back", params: {}}
        return true
    end if

    if key = "OK" and m.focusIndex = 0
        confirmLogout()
        return true
    end if

    return false
end function

sub confirmLogout()
    dlg = CreateObject("roSGNode", "StandardMessageDialog")
    dlg.title = "Cerrar sesión"
    dlg.message = "Se eliminará la cuenta de este dispositivo."
    dlg.buttons = ["Cancelar", "Cerrar sesión"]
    dlg.ObserveField("buttonSelected", "onLogoutConfirm")
    m.logoutDlg = dlg
    m.top.GetScene().Dialog = dlg
end sub

sub onLogoutConfirm()
    btn = m.logoutDlg.buttonSelected
    if btn = 1
        ClearCredentials()
        m.top.navigate = {screen: "SetupScreen", params: {}}
    end if
    m.logoutDlg = invalid
end sub
