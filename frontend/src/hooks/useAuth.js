import { useSelector, useDispatch } from 'react-redux';
import { useCallback } from 'react';
import { logoutUser } from '../store/authSlice';

export const useAuth = () => {
  const dispatch = useDispatch();
  const { user, isAuthenticated, isLoading, error } = useSelector((state) => state.auth);

  const logout = useCallback(async () => {
    await dispatch(logoutUser());
  }, [dispatch]);

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    logout,
  };
};
