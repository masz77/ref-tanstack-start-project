export interface ApiResponse<T> {
  data: T
}

export interface ApiError {
  error: string
  status: number
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}
