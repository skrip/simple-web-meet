import {configureStore} from '@reduxjs/toolkit';
import messageReducer from './messageSlice';

export const store = configureStore({
  reducer: {
    message: messageReducer,
  },
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export type RootState = ReturnType<typeof store.getState>;
