import axios, { type AxiosInstance } from 'axios'

export const BASE_URL: string = 'http://localhost:8000/api/v1'

export type ProjectStatus = 'created' | 'processing' | 'ready' | 'failed'
export type DocumentStatus = 'uploaded' | 'processing' | 'processed' | 'failed'

export interface Project {
  id: string
  name: string
  description: string | null
  status: ProjectStatus
  created_at: string
  updated_at: string
}

export interface DocumentItem {
  id: string
  project_id: string
  file_name: string
  file_path: string
  content_type: string
  file_size: number
  status: DocumentStatus
  total_chunks: number
  error_message: string | null
  created_at: string
  updated_at: string
}

export interface ChatSession {
  id: string
  project_id: string
  title: string | null
  created_at: string
}

export interface RetrievedSource {
  document_id?: string
  source_file?: string
  chunk_index?: number
  has_table?: boolean
  has_image?: boolean
  page?: number | null
  score: number
  similarity?: number
  distance?: number
  content?: string
  raw_text?: string
  tables?: string[]
  images?: string[]
}

export interface Message {
  id: string
  chat_session_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  sources?: Record<string, unknown>[] | null
  retrieval_scores?: number[] | null
  created_at: string
}

export interface ChatHistoryEntry {
  session: ChatSession
  messages: Message[]
}

const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 120_000,
})

export function getApiClient(): AxiosInstance {
  return api
}

export async function createProject(body: {
  name: string
  description?: string
}): Promise<Project> {
  const { data } = await api.post<Project>('/projects', body)
  return data
}

export async function getProjects(): Promise<Project[]> {
  const { data } = await api.get<{ items: Project[]; total: number }>('/projects')
  return data.items
}

export async function getProject(projectId: string): Promise<Project> {
  const { data } = await api.get<Project>(`/projects/${projectId}`)
  return data
}

export async function deleteProject(projectId: string): Promise<void> {
  await api.delete(`/projects/${projectId}`)
}

export async function getDocuments(projectId: string): Promise<DocumentItem[]> {
  const { data } = await api.get<{ items: DocumentItem[]; total: number }>(
    `/documents/${projectId}`,
  )
  return data.items
}

export async function uploadDocument(
  projectId: string,
  file: File,
  onUploadProgress?: (percent: number) => void,
): Promise<DocumentItem> {
  const form = new FormData()
  form.append('project_id', projectId)
  form.append('file', file)

  const { data } = await api.post<DocumentItem>('/documents/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (evt) => {
      if (!onUploadProgress || !evt.total) return
      onUploadProgress(Math.round((evt.loaded * 100) / evt.total))
    },
  })
  return data
}

export async function processDocuments(projectId: string): Promise<{
  project_id: string
  queued_documents: number
  message: string
}> {
  const { data } = await api.post(`/documents/process/${projectId}`)
  return data
}

export async function getChatSessions(
  projectId: string,
): Promise<ChatSession[]> {
  const { data } = await api.get<ChatSession[]>(`/chat/${projectId}/sessions`)
  return data
}

export async function getChatHistory(
  projectId: string,
): Promise<ChatHistoryEntry[]> {
  const { data } = await api.get<ChatHistoryEntry[]>(
    `/chat/${projectId}/history`,
  )
  return data
}

export async function createChatSession(
  projectId: string,
): Promise<ChatSession> {
  const { data } = await api.post<ChatSession>(
    `/chat/${projectId}/sessions`,
  )
  return data
}

export async function getSessionMessages(
  projectId: string,
  sessionId: string,
): Promise<Message[]> {
  const { data } = await api.get<Message[]>(
    `/chat/${projectId}/sessions/${sessionId}/messages`,
  )
  return data
}

export function getChatStreamUrl(projectId: string): string {
  return `${BASE_URL}/chat/${projectId}`
}
