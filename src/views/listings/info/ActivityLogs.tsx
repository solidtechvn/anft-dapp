import CIcon from '@coreui/icons-react';
import { CButton, CCard, CCardBody, CCardTitle, CCol, CContainer, CLabel, CRow } from '@coreui/react';
import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { RouteComponentProps } from 'react-router-dom';
import { returnTheFirstImage } from '../../../shared/casual-helpers';
import ActivityLogsContainer from '../../../shared/components/ActivityLogsContainer';
import CopyTextToClipBoard from '../../../shared/components/CopyTextToClipboard';
import InfoLoader from '../../../shared/components/InfoLoader';
import useDeviceDetect from '../../../shared/hooks/useDeviceDetect';
import useWindowDimensions from '../../../shared/hooks/useWindowDimensions';
import { RootState } from '../../../shared/reducers';
import { getEntity } from '../../assets/assets.api';
import { fetchingEntity, selectEntityById } from '../../assets/assets.reducer';
import Listings from '../Listings';

interface IActivityLogsParams {
  [x: string]: string;
}

interface IActivityLogs extends RouteComponentProps<IActivityLogsParams> {}

const ActivityLogs = (props: IActivityLogs) => {
  const { match, history } = props;
  const { id } = match.params;
  const dispatch = useDispatch();
  const scrollRef = useRef<null | HTMLParagraphElement>(null);
  const listing = useSelector(selectEntityById(Number(id)));
  const { provider } = useSelector((state: RootState) => state.wallet);
  const { initialState: assetsInitialState } = useSelector((state: RootState) => state.assets);
  const { entityLoading } = assetsInitialState;
  const { isMobile } = useDeviceDetect();

  useEffect(() => {
    if (!id || !provider) return;
    dispatch(fetchingEntity());
    dispatch(getEntity({ id: Number(id), provider }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const { width: screenWidth } = useWindowDimensions();

  const { t } = useTranslation();

  return (
    <CContainer fluid={isMobile} className={isMobile ? 'mx-0 my-2' : ''}>
      <CRow className={'justify-content-center'}>
        <CCol xs={12} lg={`${isMobile ? '12' : '8'}`} className={!isMobile ? 'mt-2' : ''}>
          <CRow className="mx-0">
            <CCol xs={12} className="p-0">
              <CButton className="text-primary p-0 pb-1 ">
                <CIcon name="cil-arrow-circle-left" onClick={() => history.goBack()} size="lg" />
              </CButton>
              <CLabel className="text-primary content-title ml-1">{t('anftDapp.listingComponent.activityLogs')}</CLabel>
            </CCol>

            <CCol xs={12} className="p-0">
              <CCard className="mt-1 listing-img-card mb-0">
                {!entityLoading && listing ? (
                  <div className="aspect-ratio-box">
                    <img src={returnTheFirstImage(listing.images)} className="aspect-ratio-item" alt="listingImg" />
                  </div>
                ) : (
                  // Ensuring 16:9 ratio for image and image loader
                  <InfoLoader width={screenWidth} height={screenWidth / 1.77} />
                )}
                <CCardBody className="p-0 listing-card-body">
                  <CCardTitle className="listing-card-title mb-0 px-3 py-2 w-100" innerRef={scrollRef}>
                    <p className="mb-2 text-white content-title">{listing?.name ? listing.name : '_'}</p>
                    <p className="mb-0 text-white detail-title-font">
                      {t('anftDapp.listingComponent.primaryInfo.blockchainAddress')}{' '}
                      <b>
                        {!entityLoading && listing?.address ? (
                          <CopyTextToClipBoard
                            text={listing.address}
                            iconClassName="text-white m-0"
                            inputClassName="copy-address"
                          />
                        ) : (
                          <InfoLoader width={155} height={27} />
                        )}
                      </b>
                    </p>
                  </CCardTitle>
                </CCardBody>
              </CCard>
              {listing?.address && (
                <ActivityLogsContainer
                  shouldDisplayBlockchainAddress={false}
                  filterState={{ listingAddress: listing.address }}
                />
              )}
            </CCol>
          </CRow>
        </CCol>
        <CCol xs={12} lg={`${isMobile ? '12' : '4'}`} className={isMobile ? `d-none` : 'p-0'}>
          <Listings />
        </CCol>
      </CRow>
    </CContainer>
  );
};

export default ActivityLogs;
