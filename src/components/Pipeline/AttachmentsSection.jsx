import { useState, useEffect, useRef } from 'react'
import { Paperclip, Upload, X, Download, FileText, Image, File, Film, Music, Archive, Loader } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'

const BUCKET = 'lead-attachments'
const MAX_MB = 25

function fmtBytes(b) {
  if (!b) return ''
  if (b < 1024) return `${b} B`
  if (b < 1048576) return `${(b / 1024).toFixed(0)} KB`
  return `${(b / 1048576).toFixed(1)} MB`
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function FileTypeIcon({ mime }) {
  const s = { size: 15, strokeWidth: 1.8 }
  if (!mime) return <File {...s} color="var(--ink-3)" />
  if (mime.startsWith('image/')) return <Image {...s} color="#4A6FA5" />
  if (mime === 'application/pdf') return <FileText {...s} color="#A50050" />
  if (mime.startsWith('video/')) return <Film {...s} color="#7A5CA5" />
  if (mime.startsWith('audio/')) return <Music {...s} color="#6A8A4A" />
  if (mime.includes('zip') || mime.includes('archive') || mime.includes('compressed')) return <Archive {...s} color="#C28A2A" />
  if (mime.includes('word') || mime.includes('document') || mime.includes('text/')) return <FileText {...s} color="#3E5C86" />
  return <File {...s} color="var(--ink-3)" />
}

export default function AttachmentsSection({ lead }) {
  const { organizationId, user } = useAuth()
  const [attachments, setAttachments] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState([])   // [{ id, name }]
  const [error, setError] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)  // attachment id
  const fileRef = useRef(null)

  useEffect(() => { fetchAttachments() }, [lead.id])  // eslint-disable-line

  async function fetchAttachments() {
    setLoading(true)
    const { data, error: err } = await supabase
      .from('lead_attachments')
      .select('*')
      .eq('lead_id', lead.id)
      .order('created_at', { ascending: false })
    setLoading(false)
    if (err) { setError(err.message); return }
    setAttachments(data || [])
  }

  async function uploadFiles(files) {
    setError(null)
    const list = Array.from(files)

    for (const file of list) {
      if (file.size > MAX_MB * 1024 * 1024) {
        setError(`"${file.name}" exceeds the ${MAX_MB} MB limit`)
        continue
      }

      const uid = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      setUploading(u => [...u, { id: uid, name: file.name }])

      const safeName = file.name.replace(/[^a-zA-Z0-9._\- ]/g, '_')
      const path = `${organizationId}/${lead.id}/${uid}-${safeName}`

      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { cacheControl: '3600', upsert: false })

      if (upErr) {
        setError(`Upload failed: ${upErr.message}`)
        setUploading(u => u.filter(x => x.id !== uid))
        continue
      }

      const { error: dbErr } = await supabase.from('lead_attachments').insert({
        lead_id: lead.id,
        organization_id: organizationId,
        name: file.name,
        storage_path: path,
        size: file.size,
        mime_type: file.type || null,
        uploaded_by: user?.id ?? null,
      })

      setUploading(u => u.filter(x => x.id !== uid))
      if (dbErr) { setError(`DB error: ${dbErr.message}`); continue }
    }

    fetchAttachments()
  }

  async function handleDownload(att) {
    setError(null)
    const { data, error: err } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(att.storage_path, 3600)
    if (err || !data?.signedUrl) { setError('Could not generate download link'); return }
    const a = Object.assign(document.createElement('a'), {
      href: data.signedUrl,
      download: att.name,
      target: '_blank',
    })
    a.click()
  }

  async function handleDelete(att) {
    // Remove from storage first, then DB (cascade handles DB too, but be explicit)
    await supabase.storage.from(BUCKET).remove([att.storage_path])
    await supabase.from('lead_attachments').delete().eq('id', att.id)
    setConfirmDelete(null)
    setAttachments(prev => prev.filter(a => a.id !== att.id))
  }

  function onDragOver(e) { e.preventDefault(); setDragOver(true) }
  function onDragLeave(e) { if (!e.currentTarget.contains(e.relatedTarget)) setDragOver(false) }
  function onDrop(e) {
    e.preventDefault()
    setDragOver(false)
    uploadFiles(e.dataTransfer.files)
  }

  const hasItems = attachments.length > 0 || uploading.length > 0

  return (
    <div style={{ marginBottom: 20 }}>
      {/* Section title */}
      <div style={{
        fontSize: 10.5, fontWeight: 700, color: 'var(--ink-4)',
        textTransform: 'uppercase', letterSpacing: '0.07em',
        paddingBottom: 8, borderBottom: '1px solid var(--line-2)', marginBottom: 10,
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <Paperclip size={11} strokeWidth={2} />
        Attachments
        {attachments.length > 0 && (
          <span style={{ fontWeight: 400 }}>({attachments.length})</span>
        )}
      </div>

      {/* Drop zone */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
        style={{
          border: `1.5px dashed ${dragOver ? 'var(--accent)' : 'var(--line)'}`,
          borderRadius: 9,
          padding: '10px 12px',
          display: 'flex', alignItems: 'center', gap: 8,
          cursor: 'pointer',
          background: dragOver ? 'var(--accent-soft)' : 'transparent',
          marginBottom: hasItems ? 8 : 0,
          transition: 'all 120ms',
          userSelect: 'none',
        }}
      >
        <Upload size={13} strokeWidth={1.8} color={dragOver ? 'var(--accent)' : 'var(--ink-3)'} />
        <span style={{ fontSize: 12, color: dragOver ? 'var(--accent)' : 'var(--ink-3)', flex: 1 }}>
          Drop files or <span style={{ color: 'var(--accent)', fontWeight: 500 }}>click to upload</span>
        </span>
        <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>Max {MAX_MB} MB</span>
      </div>
      <input
        ref={fileRef}
        type="file"
        multiple
        style={{ display: 'none' }}
        onChange={e => { uploadFiles(e.target.files); e.target.value = '' }}
      />

      {/* Error */}
      {error && (
        <div style={{
          fontSize: 11.5, color: 'var(--lose)',
          background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: 7, padding: '6px 10px', marginBottom: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
        }}>
          <span>{error}</span>
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--lose)', display: 'flex' }}>
            <X size={12} strokeWidth={2} />
          </button>
        </div>
      )}

      {/* Uploading in-progress rows */}
      {uploading.map(u => (
        <div key={u.id} style={{
          display: 'flex', alignItems: 'center', gap: 9,
          padding: '8px 10px', borderRadius: 8,
          background: 'var(--bg)', border: '1px solid var(--line)',
          marginBottom: 5, opacity: 0.8,
        }}>
          <Loader size={14} strokeWidth={1.8} color="var(--accent)" className="spin" />
          <span style={{ fontSize: 12.5, color: 'var(--ink-2)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {u.name}
          </span>
          <span style={{ fontSize: 11, color: 'var(--ink-4)', flexShrink: 0 }}>Uploading…</span>
        </div>
      ))}

      {/* Attachment list */}
      {loading ? (
        <div style={{ fontSize: 12, color: 'var(--ink-4)', padding: '4px 0' }}>Loading…</div>
      ) : attachments.length === 0 && uploading.length === 0 ? null : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {attachments.map(att => (
            <div key={att.id} style={{
              display: 'flex', alignItems: 'center', gap: 9,
              padding: '8px 10px', borderRadius: 8,
              background: 'var(--bg)', border: '1px solid var(--line)',
            }}>
              <FileTypeIcon mime={att.mime_type} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 12.5, color: 'var(--ink-1)', fontWeight: 500,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{att.name}</div>
                <div style={{ fontSize: 10.5, color: 'var(--ink-4)' }}>
                  {fmtBytes(att.size)}{att.size ? ' · ' : ''}{fmtDate(att.created_at)}
                </div>
              </div>

              {confirmDelete === att.id ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                  <button
                    onClick={() => handleDelete(att)}
                    style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6, border: 'none', background: 'var(--lose)', color: 'white', cursor: 'pointer' }}
                  >Delete</button>
                  <button
                    onClick={() => setConfirmDelete(null)}
                    style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6, border: '1px solid var(--line)', background: 'var(--panel)', color: 'var(--ink-2)', cursor: 'pointer' }}
                  >Cancel</button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                  <button
                    onClick={() => handleDownload(att)}
                    title="Download"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', padding: 5, display: 'flex', alignItems: 'center', borderRadius: 6 }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--ink-1)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--ink-3)'}
                  >
                    <Download size={13} strokeWidth={1.8} />
                  </button>
                  <button
                    onClick={() => setConfirmDelete(att.id)}
                    title="Remove attachment"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', padding: 5, display: 'flex', alignItems: 'center', borderRadius: 6 }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--lose)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--ink-3)'}
                  >
                    <X size={13} strokeWidth={1.8} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
