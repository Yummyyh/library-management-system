// frontend/src/hooks/use-toast.js
import * as React from "react"

// 常量配置
const TOAST_LIMIT = 1
const TOAST_REMOVE_DELAY = 1000000

// 动作类型
const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
}

let count = 0
function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return count.toString()
}

// 初始状态
const initialState = { toasts: [] }

// Reducer
function reducer(state, action) {
  switch (action.type) {
    case actionTypes.ADD_TOAST:
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      }
    case actionTypes.UPDATE_TOAST:
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      }
    case actionTypes.DISMISS_TOAST: {
      const { toastId } = action
      if (toastId) {
        // 添加到移除队列
        setTimeout(() => {
          reducer(state, { type: actionTypes.REMOVE_TOAST, toastId })
        }, TOAST_REMOVE_DELAY)
      }
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined ? { ...t, open: false } : t
        ),
      }
    }
    case actionTypes.REMOVE_TOAST:
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      }
    default:
      return state
  }
}

// 全局状态
const listeners = []
let memoryState = initialState

function dispatch(action) {
  memoryState = reducer(memoryState, action)
  listeners.forEach((listener) => listener(memoryState))
}

// Toast 函数
function toast(props) {
  const id = genId()
  const update = (newProps) =>
    dispatch({ type: actionTypes.UPDATE_TOAST, toast: { ...newProps, id } })
  const dismiss = () => dispatch({ type: actionTypes.DISMISS_TOAST, toastId: id })

  dispatch({
    type: actionTypes.ADD_TOAST,
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open) => {
        if (!open) dismiss()
      },
    },
  })

  return { id, dismiss, update }
}

// Hook
function useToast() {
  const [state, setState] = React.useState(memoryState)

  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) listeners.splice(index, 1)
    }
  }, [])

  return {
    ...state,
    toast,
    dismiss: (toastId) => dispatch({ type: actionTypes.DISMISS_TOAST, toastId }),
  }
}

export { useToast, toast }