import { useEffect, useRef, useState } from 'react'
import { useExerciseGymNote } from '../hooks/useExerciseGymNote'

type Props = {
  exerciseId: string
  gymId: string
}

export default function ExerciseGymCard({ exerciseId, gymId }: Props) {
  const { note, photoUrl, uploading, saveText, uploadPhoto } = useExerciseGymNote(exerciseId, gymId)
  const fileRef = useRef<HTMLInputElement>(null)
  const [editing, setEditing] = useState(false)
  const [notes, setNotes] = useState('')
  const [video, setVideo] = useState('')

  useEffect(() => {
    setNotes(note?.technique_notes ?? '')
    setVideo(note?.video_url ?? '')
  }, [note])

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) await uploadPhoto(file)
    e.target.value = ''
  }

  const save = async () => {
    await saveText({ technique_notes: notes.trim() || null, video_url: video.trim() || null })
    setEditing(false)
  }

  return (
    <div className="mb-3 flex gap-3 rounded-lg border border-slate-800 bg-slate-950/60 p-2">
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md bg-slate-800"
        aria-label="Ajouter/changer la photo de la machine"
      >
        {photoUrl ? (
          <img src={photoUrl} alt="Machine" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-xl">📷</span>
        )}
        {uploading && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/60 text-[10px] text-white">
            …
          </span>
        )}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFile}
      />

      <div className="min-w-0 flex-1 text-xs">
        {!editing ? (
          <div className="flex flex-col gap-0.5">
            <button type="button" onClick={() => setEditing(true)} className="text-left">
              {notes ? (
                <p className="line-clamp-2 text-slate-300">{notes}</p>
              ) : (
                <p className="text-slate-500">+ Notes technique / tuto</p>
              )}
            </button>
            {video && (
              <a
                href={video}
                target="_blank"
                rel="noreferrer"
                className="truncate text-indigo-400 underline"
              >
                🎥 Voir le tuto
              </a>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Points clés du mouvement..."
              rows={2}
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-white placeholder-slate-500"
            />
            <input
              value={video}
              onChange={(e) => setVideo(e.target.value)}
              placeholder="Lien vidéo (optionnel)"
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-white placeholder-slate-500"
            />
            <div className="flex gap-3">
              <button type="button" onClick={save} className="rounded-md bg-indigo-600 px-2 py-1 text-white">
                Enregistrer
              </button>
              <button type="button" onClick={() => setEditing(false)} className="text-slate-500">
                Annuler
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
