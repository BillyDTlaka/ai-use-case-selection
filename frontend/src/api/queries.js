import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from './client'

export const useClientProfiles = () =>
  useQuery({ queryKey: ['clientProfiles'], queryFn: () => api.get('/client-profile').then(r => r.data) })

export const useUseCases = (filters = {}) =>
  useQuery({
    queryKey: ['useCases', filters],
    queryFn: () => api.get('/use-cases', { params: filters }).then(r => r.data),
  })

export const useUseCase = (id) =>
  useQuery({
    queryKey: ['useCase', id],
    queryFn: () => api.get(`/use-cases/${id}`).then(r => r.data),
    enabled: !!id,
  })

export const useCreateClientProfile = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.post('/client-profile', data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clientProfiles'] }),
  })
}

export const useCreateUseCase = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.post('/use-case', data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['useCases'] }),
  })
}

export const useAnalyzeUseCase = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (useCaseId) => api.post('/analyze', { useCaseId }).then(r => r.data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['useCases'] })
      qc.invalidateQueries({ queryKey: ['useCase', data.id] })
    },
  })
}

export const useSubmitUseCase = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.post('/use-case/submit', data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['useCases'] }),
  })
}

export const useReviewUseCase = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.post('/use-case/review', data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['useCases'] }),
  })
}

export const useApproveUseCase = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.post('/use-case/approve', data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['useCases'] }),
  })
}

export const useRejectUseCase = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.post('/use-case/reject', data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['useCases'] }),
  })
}

export const useAddComment = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.post('/use-case/comment', data).then(r => r.data),
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['useCase', vars.useCaseId] }),
  })
}
