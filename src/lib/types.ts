export interface Memory {
  id: string
  name: string
  message: string
  photo_path: string | null
  is_public: boolean
  is_visible: boolean
  created_at: string
  signedUrl?: string
}

export interface WordTag {
  id: string
  word: string
  created_at: string
}
