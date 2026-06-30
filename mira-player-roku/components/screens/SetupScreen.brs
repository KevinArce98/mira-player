sub init()
    m.server = ""
    m.username = ""
    m.password = ""
    m.focusIndex = 0

    m.serverBox = m.top.FindNode("serverBox")
    m.usernameBox = m.top.FindNode("usernameBox")
    m.passwordBox = m.top.FindNode("passwordBox")
    m.connectBox = m.top.FindNode("connectBox")
    m.serverLabel = m.top.FindNode("serverLabel")
    m.usernameLabel = m.top.FindNode("usernameLabel")
    m.passwordLabel = m.top.FindNode("passwordLabel")
    m.errorLabel = m.top.FindNode("errorLabel")
    m.spinner = m.top.FindNode("spinner")

    m.task = CreateObject("roSGNode", "XtreamTask")
    m.task.ObserveField("response", "onTaskResponse")

    updateFocus()
end sub

function onKeyEvent(key as String, press as Boolean) as Boolean
    if not press then return false

    if key = "down"
        if m.focusIndex < 3
            m.focusIndex++
            updateFocus()
        end if
        return true
    else if key = "up"
        if m.focusIndex > 0
            m.focusIndex--
            updateFocus()
        end if
        return true
    else if key = "OK"
        if m.focusIndex = 3
            doConnect()
        else
            showKeyboard()
        end if
        return true
    end if

    return false
end function

sub updateFocus()
    m.serverBox.color = "0x2A2A2AFF"
    m.usernameBox.color = "0x2A2A2AFF"
    m.passwordBox.color = "0x2A2A2AFF"
    m.connectBox.color = "0xD4AA7DFF"

    if m.focusIndex = 0
        m.serverBox.color = "0x3D3322FF"
    else if m.focusIndex = 1
        m.usernameBox.color = "0x3D3322FF"
    else if m.focusIndex = 2
        m.passwordBox.color = "0x3D3322FF"
    else if m.focusIndex = 3
        m.connectBox.color = "0xC49A6DFF"
    end if
end sub

sub showKeyboard()
    kb = CreateObject("roSGNode", "StandardKeyboardDialog")

    if m.focusIndex = 0
        kb.title = "Servidor"
        kb.message = "ej: http://host:puerto"
        kb.text = m.server
    else if m.focusIndex = 1
        kb.title = "Usuario"
        kb.message = ""
        kb.text = m.username
    else if m.focusIndex = 2
        kb.title = "Contraseña"
        kb.message = ""
        kb.text = m.password
    end if

    kb.ObserveField("wasClosed", "onKeyboardClosed")
    m.activeKb = kb
    m.top.GetScene().Dialog = kb
end sub

sub onKeyboardClosed()
    if m.activeKb = invalid then return
    text = m.activeKb.text

    if m.focusIndex = 0
        m.server = text
        m.serverLabel.text = iif(text = "", "Toca OK para editar", text)
        m.serverLabel.color = iif(text = "", "0x666666FF", "0xFFFFFFFF")
    else if m.focusIndex = 1
        m.username = text
        m.usernameLabel.text = iif(text = "", "Toca OK para editar", text)
        m.usernameLabel.color = iif(text = "", "0x666666FF", "0xFFFFFFFF")
    else if m.focusIndex = 2
        m.password = text
        m.passwordLabel.text = iif(text = "", "Toca OK para editar", "••••••••")
        m.passwordLabel.color = iif(text = "", "0x666666FF", "0xFFFFFFFF")
    end if

    m.activeKb = invalid
    m.top.SetFocus(true)
end sub

sub doConnect()
    if m.server = "" or m.username = "" or m.password = ""
        m.errorLabel.text = "Completa todos los campos."
        return
    end if

    m.errorLabel.text = ""
    m.spinner.visible = true

    m.task.credentials = {server: m.server, username: m.username, password: m.password}
    m.task.request = {action: "authenticate"}
end sub

sub onTaskResponse()
    m.spinner.visible = false
    response = m.task.response

    if response.success
        SaveCredentials(m.server, m.username, m.password)
        m.top.navigate = {
            screen: "HomeScreen",
            params: {credentials: {server: m.server, username: m.username, password: m.password}}
        }
    else
        m.errorLabel.text = response.error
    end if
end sub
