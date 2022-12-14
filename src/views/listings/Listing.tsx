import CIcon from '@coreui/icons-react';
import { CCol, CContainer, CLink, CRow } from '@coreui/react';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { RouteComponentProps } from 'react-router-dom';
import SubmissionModal from '../../shared/components/SubmissionModal';
import useDeviceDetect from '../../shared/hooks/useDeviceDetect';
import { RootState } from '../../shared/reducers';
import { getEntity } from '../assets/assets.api';
import { fetchingEntity, selectEntityById } from '../assets/assets.reducer';
import Primary from './info/Primary';
import Secondary from './info/Secondary';
import Listings from './Listings';

export interface IListingParams {
  [x: string]: string;
}

interface IListingProps extends RouteComponentProps<IListingParams> {}

const Listing = (props: IListingProps) => {
  const dispatch = useDispatch();
  const { success } = useSelector((state: RootState) => state.transactions);
  const { provider } = useSelector((state: RootState) => state.wallet);
  const { initialState } = useSelector((state: RootState) => state.assets);
  const { fetchEntitiesSuccess, errorMessage } = initialState;
  const { match, history } = props;
  const { id } = match.params;
  const listing = useSelector(selectEntityById(Number(id)));
  const { isMobile } = useDeviceDetect();
  const { t } = useTranslation();

  useEffect(() => {
    /**
     * Only fetch single entity (with complete info) after fetching entities (with partial info) successfuly
     * to avoid partial info overriding complete info
     */
    if (!id || !provider || !fetchEntitiesSuccess) return;
    dispatch(fetchingEntity());
    dispatch(getEntity({ id: Number(id), provider }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, fetchEntitiesSuccess, provider, success]);

  useEffect(() => {
    /**
     * Make sure to refetch if complete info got overriden in some unknown cases
     */
    const listingHasCompleteInfo = listing?.ownership;
    if (Boolean(listingHasCompleteInfo) || !provider || !fetchEntitiesSuccess) return;
    const refetchTimer = window.setTimeout(() => {
      dispatch(fetchingEntity());
      dispatch(getEntity({ id: Number(id), provider }));
    }, 1500);
    return () => window.clearTimeout(refetchTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, listing, provider, fetchEntitiesSuccess]);

  useEffect(() => {
    const messageIfEntityDoesNotExist = 'Not Found';
    if (errorMessage === messageIfEntityDoesNotExist) {
      history.push('/');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errorMessage]);

  return (
    <CContainer>
      <CRow className={'justify-content-center'}>
        <CCol xs={12} lg={`${isMobile ? '12' : '8'}`} className={isMobile ? 'p-0' : ''}>
          <CRow className="mx-0">
            <SubmissionModal />
            <Primary listingId={Number(id)} />
            <Secondary listingId={Number(id)} />

            <CCol xs={12} className="text-center my-3">
              <CLink to={`/${Number(id)}/activity-logs`} className="text-decoration-none">
                <CIcon name="cil-history" /> {t('anftDapp.listingComponent.activityLogs')}
              </CLink>
            </CCol>
            {/* <CCol xs={12}>
              <CLabel className="text-primary content-title mt-3">{t('anftDapp.listingComponent.moreListing')}</CLabel>
            </CCol> */}
            {/* <CCol xs={12} className="px-0">
            <Listings />
          </CCol> */}
          </CRow>
        </CCol>
        <CCol xs={12} lg={`${isMobile ? '12' : '4'}`} className="p-0">
          <Listings />
        </CCol>
      </CRow>
    </CContainer>
  );
};

export default Listing;
