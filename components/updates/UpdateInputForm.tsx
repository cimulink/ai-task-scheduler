import React, { useState } from 'react'
import { Button } from '@/components/ui/Button'

interface UpdateInputFormProps {
  projectId: string
  onComplete: (data: any) => void
  isLoading: boolean
  error: string | null
}

export const UpdateInputForm: React.FC<UpdateInputFormProps> = ({
  projectId,
  onComplete,
  isLoading,
  error
}) => {
  const [updateDescription, setUpdateDescription] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisError, setAnalysisError] = useState<string | null>(null)

  const handleAnalyze = async () => {
    if (!updateDescription.trim()) return

    setAnalyzing(true)
    setAnalysisError(null)

    try {
      const response = await fetch(`/api/projects/${projectId}/updates/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          updateDescription: updateDescription.trim()
        })
      })

      if (!response.ok) {
        throw new Error('Failed to analyze update')
      }

      const result = await response.json()

      onComplete({
        updateDescription: updateDescription.trim(),
        affectedTasks: result.affectedTasks || [],
        suggestedNewTasks: result.suggestedNewTasks || []
      })
    } catch (error) {
      setAnalysisError(error instanceof Error ? error.message : 'Analysis failed')
    } finally {
      setAnalyzing(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-gray-600 mb-4">
          Describe what changes you want to make to your project. Our AI will analyze
          which existing tasks might be affected and suggest new tasks if needed.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Update Description
            </label>
            <textarea
              value={updateDescription}
              onChange={(e) => setUpdateDescription(e.target.value)}
              rows={6}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Example: Add mobile responsive design to all pages, include touch-friendly navigation and optimize images for different screen sizes..."
              maxLength={2000}
            />
            <div className="flex justify-between items-center mt-1">
              <span className="text-xs text-gray-500">
                {updateDescription.length}/2000 characters
              </span>
              {updateDescription.length > 1800 && (
                <span className="text-xs text-yellow-600">
                  Approaching character limit
                </span>
              )}
            </div>
          </div>

          {/* Examples */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-blue-900 mb-2">
              Example Updates:
            </h4>
            <div className="space-y-1 text-xs text-blue-700">
              <p>• "Add dark mode toggle to all pages with user preference storage"</p>
              <p>• "Client wants to remove the blog section and add testimonials page"</p>
              <p>• "Make the entire application mobile responsive"</p>
              <p>• "Add user authentication with login/register forms"</p>
            </div>
          </div>

          {(error || analysisError) && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">
                    {error || analysisError}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end space-x-3">
        <Button
          onClick={handleAnalyze}
          disabled={!updateDescription.trim() || analyzing || isLoading}
          className="min-w-[120px]"
        >
          {analyzing ? (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Analyzing...</span>
            </div>
          ) : (
            'Analyze Impact'
          )}
        </Button>
      </div>
    </div>
  )
}