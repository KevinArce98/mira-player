sub init()
    m.serverInfo = m.top.FindNode("serverInfo")
    m.userInfo = m.top.FindNode("userInfo")
    m.expiryInfo = m.top.FindNode("expiryInfo")
    m.statusInfo = m.top.FindNode("statusInfo")
    m.logoutBtn = m.top.FindNode("logoutBtn")
    m.logoutBtnLabel = m.top.FindNode("logoutBtnLabel")
    m.parentalBtn = m.top.FindNode("parentalBtn")
    m.parentalBtnLabel = m.top.FindNode("parentalBtnLabel")
    m.spinner = m.top.FindNode("spinner")
    m.stateLabel = m.top.FindNode("stateLabel")

    m.focusIndex = 0
    m.pendingPin = ""
    m.parentalFlow = ""

    m.task = CreateObject("roSGNode", "XtreamTask")
    m.task.ObserveField("response", "onAccountInfo")

    updateFocus()
    updateParentalLabel()
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
    m.statusInfo.color = iif(status = "Active", "0x8FBF7AFF", "0xE0857AFF")

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
    parentalFocused = (m.focusIndex = 0)
    m.parentalBtn.blendColor = iif(parentalFocused, "0xD4AA7DFF", "0x323230FF")
    m.parentalBtnLabel.color = iif(parentalFocused, "0x272727FF", "0xF3EEE6FF")

    logoutFocused = (m.focusIndex = 1)
    m.logoutBtn.blendColor = iif(logoutFocused, "0xE0857AFF", "0x323230FF")
    m.logoutBtnLabel.color = iif(logoutFocused, "0x272727FF", "0xE0857AFF")
end sub

sub updateParentalLabel()
    enabled = IsParentalEnabled()
    m.parentalBtnLabel.text = iif(enabled, "Control parental: Activado", "Control parental: Desactivado")
    updateFocus()
end sub

function onKeyEvent(key as String, press as Boolean) as Boolean
    if not press then return false

    if key = "back"
        m.top.navigate = {screen: "back", params: {}}
        return true
    end if

    if key = "up"
        if m.focusIndex > 0
            m.focusIndex = m.focusIndex - 1
            updateFocus()
        end if
        return true
    end if

    if key = "down"
        if m.focusIndex < 1
            m.focusIndex = m.focusIndex + 1
            updateFocus()
        end if
        return true
    end if

    if key = "OK"
        if m.focusIndex = 0
            toggleParental()
        else if m.focusIndex = 1
            confirmLogout()
        end if
        return true
    end if

    return false
end function

sub toggleParental()
    if IsParentalEnabled()
        m.parentalFlow = "disable"
        showPinDialog("Introduce el PIN para desactivar")
    else
        m.parentalFlow = "create"
        m.pendingPin = ""
        showPinDialog("Crea un PIN de 4 dígitos")
    end if
end sub

sub showPinDialog(title as String)
    dlg = CreateObject("roSGNode", "StandardKeyboardDialog")
    dlg.title = title
    dlg.buttons = ["Aceptar", "Cancelar"]
    dlg.textEditBox.text = ""
    dlg.textEditBox.hintText = "PIN"
    dlg.textEditBox.secureMode = true
    dlg.textEditBox.maxTextLength = 4
    dlg.ObserveField("buttonSelected", "onPinDialogButton")
    m.pinDlg = dlg
    m.top.GetScene().Dialog = dlg
end sub

sub onPinDialogButton()
    dlg = m.pinDlg
    btn = dlg.buttonSelected
    scene = m.top.GetScene()
    if scene <> invalid then scene.Dialog = invalid
    m.pinDlg = invalid

    if btn <> 0
        m.parentalFlow = ""
        return
    end if

    pin = dlg.textEditBox.text

    if m.parentalFlow = "create"
        if len(pin) <> 4
            showPinDialog("PIN inválido. Debe tener 4 dígitos")
            return
        end if
        m.pendingPin = pin
        m.parentalFlow = "confirm"
        showPinDialog("Confirma el PIN")
    else if m.parentalFlow = "confirm"
        if pin <> m.pendingPin
            m.pendingPin = ""
            m.parentalFlow = "create"
            showPinDialog("Los PIN no coinciden. Crea un PIN de 4 dígitos")
            return
        end if
        SaveParentalPin(pin)
        SetParentalEnabled(true)
        m.parentalFlow = ""
        updateParentalLabel()
    else if m.parentalFlow = "disable"
        if VerifyParentalPin(pin)
            SetParentalEnabled(false)
            m.parentalFlow = ""
            updateParentalLabel()
        else
            m.parentalFlow = ""
            showPinError()
        end if
    end if
end sub

sub showPinError()
    dlg = CreateObject("roSGNode", "StandardMessageDialog")
    dlg.title = "PIN incorrecto"
    dlg.message = "El PIN no es correcto."
    dlg.buttons = ["Cerrar"]
    m.top.GetScene().Dialog = dlg
end sub

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
    scene = m.top.GetScene()
    if scene <> invalid then scene.Dialog = invalid
    m.logoutDlg = invalid

    if btn = 1
        ClearCredentials()
        m.top.navigate = {screen: "SetupScreen", params: {}}
    end if
end sub
