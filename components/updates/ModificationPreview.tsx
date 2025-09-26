import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Task, TaskModification, SuggestedNewTask } from './UpdateFlowModal'

interface ModificationPreviewProps {
  projectId: string
  updateDescription: string
  selectedTaskIds: string[]
  inProgressTasksConfirmed: Set<string>
  existingTasks: Task[]
  onComplete: (data: any) => void
  onBack: () => void
  isLoading: boolean
  error: string | null
  cachedModifications?: TaskModification[] | null
}

interface EditableModification extends TaskModification {
  isEditing?: boolean
}

export const ModificationPreview: React.FC<ModificationPreviewProps> = ({
  projectId,
  updateDescription,
  selectedTaskIds,
  inProgressTasksConfirmed,
  existingTasks,
  onComplete,
  onBack,
  isLoading,
  error,
  cachedModifications
}) => {
  const [modifications, setModifications] = useState<EditableModification[]>([])
  const [newTasks, setNewTasks] = useState<SuggestedNewTask[]>([])
  const [loadingPreview, setLoadingPreview] = useState(true)
  const [previewError, setPreviewError] = useState<string | null>(null)

  useEffect(() => {
    if (cachedModifications && cachedModifications.length > 0) {
      console.log('[ModificationPreview] Using cached modifications, skipping API call')
      setModifications(cachedModifications)
      setLoadingPreview(false)
    } else {
      console.log('[ModificationPreview] No cached modifications, making API call')
      generatePreview()
    }
  }, [cachedModifications])

  const generatePreview = async () => {
    setLoadingPreview(true)
    setPreviewError(null)

    try {
      const response = await fetch(`/api/projects/${projectId}/updates/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          updateDescription,
          selectedTaskIds
        })
      })

      if (!response.ok) {
        throw new Error('Failed to generate modifications')
      }

      const result = await response.json()
      setModifications(result.modifications || [])
    } catch (error) {
      setPreviewError(error instanceof Error ? error.message : 'Preview generation failed')
    } finally {
      setLoadingPreview(false)
    }
  }

  const getTaskDetails = (taskId: string) => {
    return existingTasks.find(t => t.id === taskId)
  }

  const handleModificationEdit = (index: number, field: keyof TaskModification, value: any) => {
    setModifications(prev => prev.map((mod, i) =>
      i === index ? { ...mod, [field]: value } : mod
    ))
  }

  const toggleEditMode = (index: number) => {
    setModifications(prev => prev.map((mod, i) =>
      i === index ? { ...mod, isEditing: !mod.isEditing } : mod
    ))
  }

  const handleContinue = () => {
    onComplete({
      taskModifications: modifications.map(({ isEditing, ...mod }) => mod),
      newTasks
    })
  }

  if (loadingPreview) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-600">Generating modification suggestions...</p>
      </div>
    )
  }

  if (previewError) {
    return (
      <div className="text-center py-8">
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
          <p className="text-red-700">{previewError}</p>
        </div>
        <div className="space-x-3">
          <Button onClick={onBack} variant="outline">
            Go Back
          </Button>
          <Button onClick={generatePreview}>
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* In-Progress Task Warnings */}
      {selectedTaskIds.some(id => {
        const task = getTaskDetails(id)
        return task?.status === 'in_progress'
      }) && (
        <div className="bg-orange-50 border border-orange-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-orange-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-orange-800">
                In-Progress Tasks Selected
              </h3>
              <p className="text-sm text-orange-700 mt-1">
                Some of the selected tasks are currently in progress. Modifying them may affect ongoing work.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Task Modifications */}
      {modifications.length > 0 && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Suggested Task Modifications
          </h3>
          <div className="space-y-4">
            {modifications.map((modification, index) => {
              const task = getTaskDetails(modification.taskId)
              if (!task) return null

              return (
                <div key={modification.taskId} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-medium text-gray-900">
                        {task.title}
                      </h4>
                      {task.status === 'in_progress' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                          In Progress
                        </span>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleEditMode(index)}
                    >
                      {modification.isEditing ? 'Done' : 'Edit'}
                    </Button>
                  </div>

                  {/* Reasoning */}
                  <div className="mb-4 p-3 bg-blue-50 rounded">
                    <p className="text-sm text-blue-700">
                      <strong>Why this change:</strong> {modification.reasoning}
                    </p>
                  </div>

                  {/* Modifications */}
                  <div className="space-y-3">
                    {/* Title */}
                    {modification.title !== undefined && (
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Title
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-red-50 p-2 rounded text-sm">
                            <span className="text-xs text-red-600 font-medium">Before:</span>
                            <p className="text-red-800">{task.title}</p>
                          </div>
                          <div className="bg-green-50 p-2 rounded text-sm">
                            <span className="text-xs text-green-600 font-medium">After:</span>
                            {modification.isEditing ? (
                              <input
                                type="text"
                                value={modification.title}
                                onChange={(e) => handleModificationEdit(index, 'title', e.target.value)}
                                className="w-full mt-1 px-2 py-1 text-sm border border-gray-300 rounded"
                              />
                            ) : (
                              <p className="text-green-800">{modification.title}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Description */}
                    {modification.description !== undefined && (
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Description
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-red-50 p-2 rounded text-sm">
                            <span className="text-xs text-red-600 font-medium">Before:</span>
                            <p className="text-red-800">{task.description || 'No description'}</p>
                          </div>
                          <div className="bg-green-50 p-2 rounded text-sm">
                            <span className="text-xs text-green-600 font-medium">After:</span>
                            {modification.isEditing ? (
                              <textarea
                                value={modification.description}
                                onChange={(e) => handleModificationEdit(index, 'description', e.target.value)}
                                rows={3}
                                className="w-full mt-1 px-2 py-1 text-sm border border-gray-300 rounded"
                              />
                            ) : (
                              <p className="text-green-800">{modification.description}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Estimated Hours */}
                    {modification.estimatedHours !== undefined && (
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Estimated Hours
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-red-50 p-2 rounded text-sm">
                            <span className="text-xs text-red-600 font-medium">Before:</span>
                            <p className="text-red-800">{task.estimatedHours || 'Not set'} hours</p>
                          </div>
                          <div className="bg-green-50 p-2 rounded text-sm">
                            <span className="text-xs text-green-600 font-medium">After:</span>
                            {modification.isEditing ? (
                              <input
                                type="number"
                                min="0.5"
                                step="0.5"
                                value={modification.estimatedHours}
                                onChange={(e) => handleModificationEdit(index, 'estimatedHours', parseFloat(e.target.value))}
                                className="w-full mt-1 px-2 py-1 text-sm border border-gray-300 rounded"
                              />
                            ) : (
                              <p className="text-green-800">{modification.estimatedHours} hours</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Priority */}
                    {modification.priority !== undefined && (
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Priority
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-red-50 p-2 rounded text-sm">
                            <span className="text-xs text-red-600 font-medium">Before:</span>
                            <p className="text-red-800">{task.priority}/100</p>
                          </div>
                          <div className="bg-green-50 p-2 rounded text-sm">
                            <span className="text-xs text-green-600 font-medium">After:</span>
                            {modification.isEditing ? (
                              <input
                                type="number"
                                min="1"
                                max="100"
                                value={modification.priority}
                                onChange={(e) => handleModificationEdit(index, 'priority', parseInt(e.target.value))}
                                className="w-full mt-1 px-2 py-1 text-sm border border-gray-300 rounded"
                              />
                            ) : (
                              <p className="text-green-800">{modification.priority}/100</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* No modifications */}
      {modifications.length === 0 && (
        <div className="text-center py-8">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-4 text-sm font-medium text-gray-900">No Modifications Needed</h3>
          <p className="mt-2 text-sm text-gray-500">
            The AI determined that the selected tasks don't need any modifications for this update.
          </p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between space-x-3">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={isLoading}
        >
          Back
        </Button>
        <Button
          onClick={handleContinue}
          disabled={isLoading}
        >
          Continue to Summary
        </Button>
      </div>
    </div>
  )
}