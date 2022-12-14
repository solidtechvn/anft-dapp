import { createEntityAdapter, createSelector, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { IAsset } from '../../shared/models/assets.model';
import { IGetAllResp, IInitialState } from '../../shared/models/base.model';
import { RootState } from '../../shared/reducers';
import { IAssetFilter } from '../listings/Listings';
import { getEntities, getEntity, getListingsInfo, getOptionsWithStakes } from './assets.api';

interface IInitialFilterState extends IInitialState {
  filterState: IAssetFilter | undefined;
}
const initialState: IInitialFilterState = {
  fetchEntitiesSuccess: false,
  fetchEntitySuccess: false,
  updateEntitySuccess: false,
  deleteEntitySuccess: false,
  entitiesLoading: false,
  entityLoading: false,
  errorMessage: null,
  totalItems: 0,
  filterState: undefined,
};

export const assetsAdapter = createEntityAdapter<IAsset>({
  selectId: ({ id }) => id,
});

// Config slice
const { actions, reducer } = createSlice({
  name: 'assets',
  initialState: assetsAdapter.getInitialState({ initialState }),
  reducers: {
    fetchingEntities({ initialState }) {
      initialState.entitiesLoading = true;
    },
    fetchingEntity({ initialState }) {
      initialState.entityLoading = true;
    },
    hardReset({ initialState }) {
      initialState.entitiesLoading = false;
      initialState.entityLoading = false;
      initialState.fetchEntitiesSuccess = false;
      initialState.fetchEntitySuccess = false;
      initialState.updateEntitySuccess = false;
      initialState.deleteEntitySuccess = false;
      initialState.errorMessage = null;
      initialState.totalItems = 0;
    },
    softReset({ initialState }) {
      initialState.updateEntitySuccess = false;
      initialState.errorMessage = null;
      initialState.fetchEntitySuccess = false;
      initialState.deleteEntitySuccess = false;
      initialState.fetchEntitiesSuccess = false;
      initialState.filterState = undefined;
    },
    setFilterState({initialState}, {payload}: PayloadAction<IAssetFilter>) {
      initialState.filterState = payload;
    },

  },
  extraReducers: {
    [getEntities.fulfilled.type]: (state, { payload }: PayloadAction<IGetAllResp<IAsset>>) => {
      assetsAdapter.setAll(state, payload.results);
      state.initialState.totalItems = payload.count;
      state.initialState.fetchEntitiesSuccess = true;
      state.initialState.entitiesLoading = false;
    },
    [getEntities.rejected.type]: (state, { payload }: PayloadAction<any>) => {
      state.initialState.errorMessage = payload?.message;
      state.initialState.entitiesLoading = false;
      state.initialState.fetchEntitiesSuccess = false;
    },
    [getEntity.fulfilled.type]: (state, { payload }: PayloadAction<IAsset>) => {
      assetsAdapter.upsertOne(state, payload);
      state.initialState.fetchEntitySuccess = true;
      state.initialState.entityLoading = false;
    },
    [getEntity.rejected.type]: (state, { payload }: PayloadAction<any>) => {
      state.initialState.errorMessage = payload?.message;
      state.initialState.entityLoading = false;
      state.initialState.fetchEntitySuccess = false;
    },
    [getOptionsWithStakes.fulfilled.type]: (state, { payload }: PayloadAction<IAsset>) => {
      assetsAdapter.upsertOne(state, payload);
      state.initialState.updateEntitySuccess = true;
      state.initialState.entityLoading = false;
    },
    [getOptionsWithStakes.rejected.type]: (state, { payload }: PayloadAction<any>) => {
      state.initialState.errorMessage = payload?.message;
      state.initialState.updateEntitySuccess = false;
      state.initialState.entityLoading = false;
    },
    [getListingsInfo.fulfilled.type]: (state, { payload }: PayloadAction<IGetAllResp<IAsset>>) => {
      assetsAdapter.setAll(state, payload.results);
      state.initialState.totalItems = payload.count;
      state.initialState.fetchEntitiesSuccess = true;
      state.initialState.entitiesLoading = false;
    },
    [getListingsInfo.rejected.type]: (state, { payload }: PayloadAction<any>) => {
      state.initialState.errorMessage = payload?.message;
      state.initialState.entitiesLoading = false;
      state.initialState.fetchEntitiesSuccess = false;
    },
  },
});

// Export actions
export default reducer;
export const { setFilterState, fetchingEntities, fetchingEntity, hardReset, softReset } = actions;

const { selectById } = assetsAdapter.getSelectors();

const getAssetState = (rootState: RootState) => rootState.assets;

export const selectEntityById = (id: number) => {
  return createSelector(getAssetState, (state) => selectById(state, id));
};

export const assetsSelectors = assetsAdapter.getSelectors<RootState>((state) => state.assets);
