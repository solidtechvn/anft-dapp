import { createAsyncThunk } from '@reduxjs/toolkit';
import { BigNumber, ethers } from 'ethers';
import { pickBy } from 'lodash';
import axios from '../../config/axios-interceptor';
import { MANAGEMENT_SITE_URL } from '../../config/constants';
import { LISTING_INSTANCE } from '../../shared/blockchain-helpers';
import { ToastInfo } from '../../shared/components/Toast';
import { IAsset } from '../../shared/models/assets.model';
import { IGetAllResp } from '../../shared/models/base.model';
import { IOption, IStake } from '../../shared/models/options.model';
import { Listing } from '../../typechain';
import { IAssetFilter } from '../listings/Listings';

// const prefix = 'assets';
const prefix = 'public/listings';

// APIs calling centralized server
interface IGetEntities {
  fields: IAssetFilter
  provider: ethers.providers.Web3Provider;
}

export const getEntities = createAsyncThunk(`get-all-${prefix}`, async ({fields, provider}: IGetEntities, thunkAPI) => {
  try {
    const params = pickBy(fields);
    const { data } = await axios.get<IGetAllResp<IAsset> >(`${MANAGEMENT_SITE_URL}api/public/listings`, { params });
    // Attemp to fetch blockchain data
    const listingsPartialInfo = await getListingsPartialInfo(data.results, provider);
    data.results = listingsPartialInfo;
    return data;
  } catch (error: any) {
    return thunkAPI.rejectWithValue(error.response.data);
  }
});

interface IGetEntity {
  id: number;
  provider: ethers.providers.Web3Provider;
}
export const getEntity = createAsyncThunk(`get-single-${prefix}`, async ({id, provider}: IGetEntity, thunkAPI) => {
  try {
    const { data } = await axios.get<IAsset>(`${MANAGEMENT_SITE_URL}api/public/listings/${id}`);
    return await getListingCompleteInfo(data, provider);
  } catch (error: any) {
    return thunkAPI.rejectWithValue(error.response.data);
  }
});

// APIs calling blockchain
const getListingCompleteInfo = async (listing: IAsset, provider: ethers.providers.Web3Provider): Promise<IAsset> => {
  try {
    const instance = LISTING_INSTANCE({address: listing.address, provider});
    if (!instance) return listing;

    const promises = [
      instance.ownership(),
      instance.value(),
      instance.dailyPayment(),
      instance.owner(),
      instance.validator(),
      instance.totalStake(),
    ];

    const [ownership, value, dailyPayment, owner, validator, totalStake] = await Promise.all(
      Object.values(promises)
    ) ;

    return {
      ...listing,
      ownership: ownership as BigNumber,
      value: value as BigNumber,
      dailyPayment: dailyPayment as BigNumber,
      owner: owner as string,
      validator: validator as string,
      totalStake: totalStake as BigNumber,
    };
  } catch (error) {
    ToastInfo(`Error in fetching complete: ${error}`);
    return listing;
  }
};

const getListingsPartialInfo = async (listings: IAsset[], provider: ethers.providers.Web3Provider): Promise<IAsset[]> => {
  try {
    // Only value and dailyPayment is neccessary
    const valuePromises: Promise<BigNumber | undefined>[] = [];
    const paymentPromises: Promise<BigNumber | undefined>[] = [];

    for (let index = 0; index < listings.length; index++) {
      const { address } = listings[index];
      const instance = LISTING_INSTANCE({address, provider});
      if ( instance ) {
        valuePromises.push(instance.value());
        paymentPromises.push(instance.dailyPayment());
      }
    }

    // Calling promises
    const listingValues = await Promise.all(valuePromises);
    const listingPayment = await Promise.all(paymentPromises);

    // Mapping new properties based on index
    // https://stackoverflow.com/questions/28066429/promise-all-order-of-resolved-values
    return listings.map((e, i) => ({
      ...e,
      value: listingValues[i],
      dailyPayment: listingPayment[i],
    }));
  } catch (error) {
    console.log(`Error in fetching partialInfo: ${error}`);
    return listings;
  }
};

interface IGetOptionsWithStakes {
  listing: IAsset;
  stakeholder: string;
  provider: ethers.providers.Web3Provider
}

export const getOptionsWithStakes = createAsyncThunk(
  `get-${prefix}-options`,
  async (body: IGetOptionsWithStakes, thunkAPI) => {
    try {
      const { listing, stakeholder, provider } = body;
      const instance = LISTING_INSTANCE({address: listing.address, provider});
      if (!instance) throw String('Error in generating listing instance');
      const options = await getOptionsOverview(instance, listing);
      const optionsWithStakesPromises = options.map(({ id }) => getOptionStake(instance, id, stakeholder));
      const results = await Promise.all(optionsWithStakesPromises);

      const optionsWithStakes: IOption[] = options.map((e, i) => ({
        ...e,
        stake: results[i],
      }));

      return { ...listing, listingPotentials: optionsWithStakes };
    } catch (error: any) {
      return thunkAPI.rejectWithValue(error.response.data);
    }
  }
);

const getOptionsOverview = async (contract: Listing, listing: IAsset) => {
  const optionsPromises = listing.listingPotentials.map((item, i) => contract.options(i));

  const results = await Promise.all(optionsPromises);

  const options: IOption[] = listing.listingPotentials.map((initialOption, i) => ({
    ...initialOption,
    id: i,
    reward: results[i]._reward,
    totalStake: results[i]._totalStake,
    isSet: results[i]._isSet,
  }));
  return options;
};

const getOptionStake = async (listingContract: Listing, optionId: number, stakeholder: string) => {
  const stakePromise = listingContract.stakings(optionId, stakeholder);
  const result = await stakePromise;

  const stake: IStake = {
    start: result._start,
    amount: result._amount,
    active: result._active,
  };
  return stake;
};

interface IGetListingsByListingAddresses {
  addresses: string[]
}

export const getListingsInfo = createAsyncThunk(`get-all-${prefix}`, async (body: IGetListingsByListingAddresses, thunkAPI) => {
  try {
    const { data } = await axios.post<IGetAllResp<IAsset> >(`${MANAGEMENT_SITE_URL}api/public/listings`, body);
    return data;
  } catch (error: any) {
    return thunkAPI.rejectWithValue(error.response.data);
  }
});