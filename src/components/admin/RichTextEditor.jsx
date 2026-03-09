import { useEffect, useRef } from 'react'

const EMOJIS = ['🔥', '❤️', '✨', '🎬', '📸', '🎧']

function ToolbarButton({ label, onClick }) {
  return (
    <button
      type="button"
      className="admin-secondary-button"
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      {label}
    </button>
  )
}

export function RichTextEditor({ value, onChange }) {
  const editorRef = useRef(null)

  useEffect(() => {
    if (!editorRef.current) {
      return
    }

    if (editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '<p></p>'
    }
  }, [value])

  function runCommand(command, commandValue = null) {
    document.execCommand(command, false, commandValue)
    onChange(editorRef.current?.innerHTML || '<p></p>')
  }

  return (
    <div className="admin-rich-editor">
      <div className="admin-rich-toolbar">
        <ToolbarButton label="B" onClick={() => runCommand('bold')} />
        <ToolbarButton label="I" onClick={() => runCommand('italic')} />
        <ToolbarButton label="U" onClick={() => runCommand('underline')} />
        <ToolbarButton label="H2" onClick={() => runCommand('formatBlock', 'h2')} />
        <ToolbarButton label="Lista" onClick={() => runCommand('insertUnorderedList')} />
        <ToolbarButton label="Num" onClick={() => runCommand('insertOrderedList')} />
        <ToolbarButton
          label="Link"
          onClick={() => {
            const url = window.prompt('URL del enlace')
            if (url) {
              runCommand('createLink', url)
            }
          }}
        />
        {EMOJIS.map((emoji) => (
          <ToolbarButton key={emoji} label={emoji} onClick={() => runCommand('insertText', emoji)} />
        ))}
      </div>

      <div
        ref={editorRef}
        className="admin-rich-surface"
        contentEditable
        suppressContentEditableWarning
        onInput={() => onChange(editorRef.current?.innerHTML || '<p></p>')}
      />
    </div>
  )
}
