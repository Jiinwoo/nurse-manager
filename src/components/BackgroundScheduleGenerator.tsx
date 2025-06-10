import React, { useState, useEffect, useCallback } from 'react';

interface ScheduleProgress {
  taskId: string;
  currentDepth: number;
  maxDepth: number;
  progressPercent: number;
  totalExplored: number;
  solutionsFound: number;
  elapsedSeconds: number;
  nodesPerSecond: number;
  currentDate: string | null;
}

interface Props {
  params: {
    year: number;
    month: number;
    seniorNurses: any[];
    existingShifts: any[];
    rules: any;
    maxSolutions?: number;
  };
  onComplete: (solutions: any[]) => void;
  onError: (error: string) => void;
  isVisible: boolean;
}

export const BackgroundScheduleGenerator: React.FC<Props> = ({ 
  params, 
  onComplete, 
  onError, 
  isVisible 
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<ScheduleProgress | null>(null);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);

  const handleScheduleUpdate = useCallback((event: any, data: any) => {
    const { taskId, type, data: updateData } = data;
    
    if (currentTaskId && taskId !== currentTaskId) return; // 다른 작업의 업데이트 무시
    
    switch (type) {
      case 'started':
        console.log('✅ 백그라운드 스케줄 생성이 시작되었습니다.');
        break;
        
      case 'progress':
        setProgress(prev => ({ ...prev, taskId, ...updateData }));
        break;
        
      case 'solution_found':
        console.log(`🎉 해답 #${updateData.solutionIndex + 1} 발견!`, updateData);
        break;
        
      case 'completed':
        console.log('✅ 스케줄 생성이 완료되었습니다!');
        setIsRunning(false);
        setProgress(null);
        setCurrentTaskId(null);
        onComplete(updateData.solutions);
        break;
        
      case 'error':
        console.error('❌ 스케줄 생성 중 오류 발생:', updateData.error);
        setIsRunning(false);
        setProgress(null);
        setCurrentTaskId(null);
        onError(updateData.error);
        break;
        
      case 'cancelled':
        console.log('⏹️ 스케줄 생성이 취소되었습니다.');
        setIsRunning(false);
        setProgress(null);
        setCurrentTaskId(null);
        break;
    }
  }, [currentTaskId, onComplete, onError]);

  useEffect(() => {
    // 이벤트 리스너 등록
    if (typeof window !== 'undefined' && window.api) {
      window.api.shifts.onScheduleGenerationUpdate(handleScheduleUpdate);
    }
    
    return () => {
      // 컴포넌트 언마운트 시 리스너 제거
      if (typeof window !== 'undefined' && window.api) {
        window.api.shifts.removeScheduleGenerationListener(handleScheduleUpdate);
      }
    };
  }, [handleScheduleUpdate]);

  const startGeneration = async () => {
    try {
      setIsRunning(true);
      const response = await window.api.shifts.startBackgroundScheduleGeneration(params);
      
      if (response.success) {
        setCurrentTaskId(response.data.taskId);
      } else {
        setIsRunning(false);
        onError(response.error || '작업 시작에 실패했습니다.');
      }
    } catch (error) {
      setIsRunning(false);
      onError('작업 시작 중 오류가 발생했습니다.');
    }
  };

  const cancelGeneration = async () => {
    if (currentTaskId) {
      try {
        await window.api.shifts.cancelBackgroundScheduleGeneration(currentTaskId);
      } catch (error) {
        console.error('취소 요청 실패:', error);
      }
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border">
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        <span className="mr-2">🔄</span>
        백그라운드 스케줄 생성
      </h3>
      
      {!isRunning ? (
        <div className="space-y-4">
          <div className="text-sm text-gray-600 space-y-1">
            <p>• 대상 기간: {params.year}년 {params.month}월</p>
            <p>• 4년차 이상 간호사: {params.seniorNurses.length}명</p>
            <p>• 최대 해답 수: {params.maxSolutions || 100}개</p>
          </div>
          <button
            onClick={startGeneration}
            className="w-full px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
          >
            스케줄 생성 시작
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">진행 상황</span>
            <button
              onClick={cancelGeneration}
              className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition-colors"
            >
              취소
            </button>
          </div>
          
          {progress && (
            <div className="space-y-3">
              <div className="flex justify-between text-sm font-medium">
                <span className="text-blue-600">진행률: {progress.progressPercent}%</span>
                <span className="text-green-600">해답: {progress.solutionsFound}개</span>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progress.progressPercent}%` }}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-xs text-gray-600 bg-gray-50 p-3 rounded">
                <div className="flex justify-between">
                  <span>현재 위치:</span>
                  <span className="font-mono">{progress.currentDepth}/{progress.maxDepth}일</span>
                </div>
                <div className="flex justify-between">
                  <span>소요 시간:</span>
                  <span className="font-mono">{progress.elapsedSeconds}초</span>
                </div>
                <div className="flex justify-between">
                  <span>탐색 노드:</span>
                  <span className="font-mono">{progress.totalExplored.toLocaleString()}개</span>
                </div>
                <div className="flex justify-between">
                  <span>처리 속도:</span>
                  <span className="font-mono">{progress.nodesPerSecond.toLocaleString()}/초</span>
                </div>
              </div>
              
              {progress.currentDate && (
                <div className="text-sm text-center p-2 bg-blue-50 rounded border border-blue-200">
                  <span className="text-blue-800 font-medium">
                    현재 처리 중: {new Date(progress.currentDate).toLocaleDateString('ko-KR')} 
                    ({new Date(progress.currentDate).getDate()}일)
                  </span>
                </div>
              )}
              
              {progress.solutionsFound > 0 && (
                <div className="text-sm text-center p-2 bg-green-50 rounded border border-green-200">
                  <span className="text-green-800 font-medium">
                    🎉 {progress.solutionsFound}개의 해답을 찾았습니다!
                  </span>
                </div>
              )}
            </div>
          )}
          
          {!progress && (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <span className="ml-3 text-gray-600">작업을 시작하는 중...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}; 