import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { ExerciseGymNote } from '../lib/types'

const BUCKET = 'exercise-photos'

export function useExerciseGymNote(exerciseId: string | null, gymId: string | null) {
  const [note, setNote] = useState<ExerciseGymNote | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)

  const refresh = useCallback(async () => {
    if (!exerciseId || !gymId) {
      setNote(null)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('exercise_gym_notes')
        .select('*')
        .eq('exercise_id', exerciseId)
        .eq('gym_id', gymId)
        .maybeSingle()
      if (!error) setNote((data as ExerciseGymNote | null) ?? null)
    } catch {
      // réseau indisponible : on garde les données déjà en mémoire
    } finally {
      setLoading(false)
    }
  }, [exerciseId, gymId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const photoUrl = note?.photo_path
    ? supabase.storage.from(BUCKET).getPublicUrl(note.photo_path).data.publicUrl
    : null

  const saveText = async (fields: { technique_notes: string | null; video_url: string | null }) => {
    if (!exerciseId || !gymId) return
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return
    await supabase.from('exercise_gym_notes').upsert(
      {
        user_id: userData.user.id,
        exercise_id: exerciseId,
        gym_id: gymId,
        updated_at: new Date().toISOString(),
        ...fields,
      },
      { onConflict: 'user_id,exercise_id,gym_id' },
    )
    await refresh()
  }

  const uploadPhoto = async (file: File) => {
    if (!exerciseId || !gymId) return
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return
    setUploading(true)
    try {
      const path = `${userData.user.id}/${exerciseId}_${gymId}`
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: true, contentType: file.type })
      if (uploadError) return
      await supabase.from('exercise_gym_notes').upsert(
        {
          user_id: userData.user.id,
          exercise_id: exerciseId,
          gym_id: gymId,
          photo_path: path,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,exercise_id,gym_id' },
      )
      await refresh()
    } finally {
      setUploading(false)
    }
  }

  return { note, photoUrl, loading, uploading, saveText, uploadPhoto }
}
