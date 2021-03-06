import {createSlice, PayloadAction} from '@reduxjs/toolkit';
import produce from 'immer';
import {Transport} from 'mediasoup-client/lib/types';

export interface Participant {
  no: number;
  participantName: string;
  transport: Transport;
  remoteStream: MediaStream;
  is_screen_share: boolean;
  //videoref?: HTMLVideoElement | undefined
}
export interface Owner {
  name: string;
}
const initialParticipantState: Participant[] = [];
const initialOwner: Owner = {
  name: '',
};
export const messageSlice = createSlice({
  name: 'message',
  initialState: {
    participant: initialParticipantState,
    owner: initialOwner,
  },
  reducers: {
    updateParticipantIsScreenShare: (
      state,
      action: PayloadAction<{name: string; is_screen_share: boolean}>,
    ) => {
      //state.value.unshift(action.payload);
      state.participant = produce(state.participant, draft => {
        const i = draft.findIndex(
          dt => dt.participantName === action.payload.name,
        );
        if (i > -1) {
          draft[i].is_screen_share = action.payload.is_screen_share;
        }
      });
    },
    addParticipant: (state, action: PayloadAction<Participant>) => {
      //state.value.unshift(action.payload);
      state.participant = produce(state.participant, draft => {
        draft.push(action.payload);
      });
    },
    removeParticipant: (state, action: PayloadAction<string>) => {
      //state.value.unshift(action.payload);
      state.participant = produce(state.participant, draft => {
        const i = draft.findIndex(dt => dt.participantName === action.payload);
        if (i > -1) {
          draft.splice(i, 1);
        }
      });
    },
    updateOwner: (state, action: PayloadAction<Owner>) => {
      //state.value.unshift(action.payload);
      state.owner = produce(state.owner, draft => {
        draft.name = action.payload.name;
      });
    },
  },
});

export const {
  addParticipant,
  removeParticipant,
  updateOwner,
  updateParticipantIsScreenShare,
} = messageSlice.actions;

export default messageSlice.reducer;
