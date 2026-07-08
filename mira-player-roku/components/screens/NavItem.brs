sub init()
    m.bg = m.top.FindNode("bg")
    m.icon = m.top.FindNode("icon")
    m.label = m.top.FindNode("label")
    m.bg.visible = false
end sub

sub onContentSet()
    content = m.top.itemContent
    if content = invalid then return
    m.label.text = content.title
    m.icon.uri = content.iconUri
    updateColors()
end sub

sub onFocusChanged()
    m.bg.visible = (m.top.focusPercent > 0.5)
    updateColors()
end sub

sub updateColors()
    focused = m.top.focusPercent > 0.5
    m.label.color = iif(focused, "0x272727FF", "0xA39C90FF")
    m.icon.blendColor = iif(focused, "0x272727FF", "0xA39C90FF")
end sub
