import { useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  useUseCase, useAnalyzeUseCase, useSubmitUseCase,
  useReviewUseCase, useApproveUseCase, useRejectUseCase, useAddComment,
} from '../api/queries'
import { useAppStore } from '../store/appStore'
import { ScoreCell } from '../components/ScoreCell'
import { StatusBadge } from '../components/StatusBadge'
import { RecommendationBadge } from '../components/RecommendationBadge'

function ScoreEditor({ scores, onChange }) {
  const fields = [
    { key: 'value', label: 'Business Value' },
    { key: 'feasibility', label: 'Feasibility' },
    { key: 'data', label: 'Data Readiness' },
    { key: 'speed', label: 'Time to Value' },
    { key: 'risk', label: 'Risk (penalises score)' },
  ]
  return (
    <div className="grid grid-cols-5 gap-3">
      {fields.map(f => (
        <div key={f.key}>
          <label className="block text-xs text-gray-500 mb-1">{f.label}</label>
          <select
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-maroon-900"
            value={scores[f.key] ?? ''}
            onChange={e => onChange({ ...scores, [f.key]: Number(e.target.value) })}
          >
            <option value="">—</option>
            {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      ))}
    </div>
  )
}

export function UseCaseDetailPage() {
  const { id } = useParams()
  const { data: uc, isLoading } = useUseCase(id)
  const { currentUser } = useAppStore()
  const { mutateAsync: analyze, isPending: analyzing } = useAnalyzeUseCase()
  const { mutateAsync: submit, isPending: submitting } = useSubmitUseCase()
  const { mutateAsync: review, isPending: reviewing } = useReviewUseCase()
  const { mutateAsync: approve, isPending: approving } = useApproveUseCase()
  const { mutateAsync: reject, isPending: rejecting } = useRejectUseCase()
  const { mutateAsync: addComment, isPending: commenting } = useAddComment()
  const [editedScores, setEditedScores] = useState(null)
  const [comment, setComment] = useState('')

  if (isLoading) return <div className="text-gray-400 p-8">Loading…</div>
  if (!uc) return <div className="text-red-500 p-8">Use case not found.</div>

  const currentScores = editedScores ?? {
    value: uc.scoreValue, feasibility: uc.scoreFeasibility,
    data: uc.scoreData, speed: uc.scoreSpeed, risk: uc.scoreRisk,
  }

  const aiScores = {
    value: uc.aiScoreValue, feasibility: uc.aiScoreFeasibility,
    data: uc.aiScoreData, speed: uc.aiScoreSpeed, risk: uc.aiScoreRisk,
  }

  const canAnalyze = uc.status === 'DRAFT'
  const canSubmit = uc.status === 'DRAFT' && uc.totalScore != null
  const canReview = uc.status === 'IN_REVIEW' && currentUser?.role === 'Reviewer'
  const canApprove = uc.status === 'IN_REVIEW' && currentUser?.role === 'Approver'

  const handleReview = () => review({ id: uc.id, reviewedBy: currentUser?.name, scores: editedScores })
  const handleApprove = () => approve({ id: uc.id, approvedBy: currentUser?.name })
  const handleReject = () => reject({ id: uc.id, approvedBy: currentUser?.name })
  const handleComment = async (e) => {
    e.preventDefault()
    if (!comment.trim()) return
    await addComment({ useCaseId: id, content: comment.trim(), author: currentUser?.name ?? 'Unknown', role: currentUser?.role ?? 'Creator' })
    setComment('')
  }

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{uc.title}</h1>
          <div className="flex items-center gap-3 mt-2">
            <StatusBadge status={uc.status} />
            <RecommendationBadge value={uc.recommendation} />
            {uc.category && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{uc.category}</span>}
          </div>
        </div>
        <div className="flex gap-2">
          {canAnalyze && (
            <button
              onClick={() => analyze(id)}
              disabled={analyzing}
              className="bg-maroon-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-maroon-800 disabled:opacity-50 transition"
            >
              {analyzing ? 'Analysing…' : 'Run AI Analysis'}
            </button>
          )}
          {canSubmit && (
            <button
              onClick={() => submit({ id: uc.id, submittedBy: currentUser?.name })}
              disabled={submitting}
              className="bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-600 disabled:opacity-50 transition"
            >
              {submitting ? 'Submitting…' : 'Submit for Review'}
            </button>
          )}
        </div>
      </div>

      {/* Details */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 grid grid-cols-2 gap-6">
        <div>
          <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Description</div>
          <p className="text-sm text-gray-700">{uc.description}</p>
        </div>
        <div>
          <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Business Objective</div>
          <p className="text-sm text-gray-700">{uc.businessObjective}</p>
        </div>
        <div>
          <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Business Unit / Domain</div>
          <p className="text-sm text-gray-700">{uc.businessUnit} · {uc.domain}</p>
        </div>
        <div>
          <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Workspace / Owner</div>
          <p className="text-sm text-gray-700">{uc.workspace} · {uc.owner}</p>
        </div>
      </div>

      {/* AI Analysis */}
      {uc.aiSummary && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-800">AI Analysis</h2>
          <div>
            <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Summary</div>
            <p className="text-sm text-gray-700">{uc.aiSummary}</p>
          </div>
          <div>
            <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Business Problem</div>
            <p className="text-sm text-gray-700">{uc.businessProblem}</p>
          </div>
          <div>
            <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Reasoning</div>
            <p className="text-sm text-gray-700">{uc.reasoning}</p>
          </div>
        </div>
      )}

      {/* Scores */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-800">Scores</h2>
          {uc.totalScore != null && (
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">{uc.totalScore}</div>
              <div className="text-xs text-gray-400">Total Score</div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-5 gap-4 mb-4">
          {[
            { label: 'Value', ai: aiScores.value, current: uc.scoreValue },
            { label: 'Feasibility', ai: aiScores.feasibility, current: uc.scoreFeasibility },
            { label: 'Data', ai: aiScores.data, current: uc.scoreData },
            { label: 'Speed', ai: aiScores.speed, current: uc.scoreSpeed },
            { label: 'Risk', ai: aiScores.risk, current: uc.scoreRisk },
          ].map(s => (
            <div key={s.label} className="text-center">
              <div className="text-xs text-gray-400 mb-1">{s.label}</div>
              <ScoreCell value={s.current} />
              {s.ai != null && s.ai !== s.current && (
                <div className="text-xs text-gray-300 mt-1">AI: {s.ai}</div>
              )}
            </div>
          ))}
        </div>

        {canReview && (
          <div className="border-t border-gray-100 pt-4 space-y-3">
            <div className="text-sm font-medium text-gray-700">Adjust Scores</div>
            <ScoreEditor scores={currentScores} onChange={setEditedScores} />
            <button onClick={handleReview} disabled={reviewing} className="mt-2 bg-maroon-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-maroon-800 disabled:opacity-50 transition">
              {reviewing ? 'Saving…' : 'Save Review'}
            </button>
          </div>
        )}
      </div>

      {/* Approve / Reject */}
      {canApprove && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 flex gap-3">
          <button onClick={handleApprove} disabled={approving} className="bg-green-700 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-green-600 disabled:opacity-50 transition">
            {approving ? 'Approving…' : 'Approve'}
          </button>
          <button onClick={handleReject} disabled={rejecting} className="bg-red-700 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-red-600 disabled:opacity-50 transition">
            {rejecting ? 'Rejecting…' : 'Reject'}
          </button>
        </div>
      )}

      {/* Comments */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold text-gray-800">Comments</h2>
        {uc.comments?.length === 0 && <p className="text-sm text-gray-400">No comments yet.</p>}
        <div className="space-y-3">
          {uc.comments?.map(c => (
            <div key={c.id} className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-gray-800">{c.author}</span>
                <span className="text-xs text-gray-400">{c.role}</span>
                <span className="text-xs text-gray-300 ml-auto">{new Date(c.createdAt).toLocaleString()}</span>
              </div>
              <p className="text-sm text-gray-700">{c.content}</p>
            </div>
          ))}
        </div>
        {uc.status !== 'APPROVED' && (
          <form onSubmit={handleComment} className="flex gap-2">
            <input
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maroon-900"
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Add a comment…"
            />
            <button type="submit" disabled={commenting || !comment.trim()} className="bg-maroon-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-maroon-800 disabled:opacity-50 transition">
              Post
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
