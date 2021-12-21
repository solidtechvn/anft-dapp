import CIcon from '@coreui/icons-react';
import {
  CButton,
  CCard,
  CCardBody,
  CCol,
  CCollapse,
  CContainer,
  CDataTable,
  CLink,
  CRow,
  CTooltip
} from '@coreui/react';
import {
  faArrowAltCircleDown,
  faArrowAltCircleUp,
  faClipboard,
  faDonate,
  faEdit,
  faIdBadge
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, { useState } from 'react';
import CopyToClipboard from 'react-copy-to-clipboard';
import { useSelector } from 'react-redux';
import { TOKEN_SYMBOL } from '../../../config/constants';
import { checkOwnershipExpired, convertUnixToDate, formatBNToken, getEllipsisTxt } from '../../../shared/casual-helpers';
import InfoLoader from '../../../shared/components/InfoLoader';
import { ToastError } from '../../../shared/components/Toast';
import { CollapseType, ModalType, TCollapseVisibility, TModalsVisibility } from '../../../shared/enumeration/modalType';
import { WorkerStatus } from '../../../shared/enumeration/workerStatus';
import useWindowDimensions from '../../../shared/hooks/useWindowDimensions';
import { IAsset } from '../../../shared/models/assets.model';
import { IWorkerPermission } from '../../../shared/models/workerPermission.model';
import { RootState } from '../../../shared/reducers';
import { selectEntityById } from '../../assets/assets.reducer';
import ExtendOwnershipModal from '../actions/ExtendOwnershipModal';
import RegisterOwnershipModal from '../actions/RegisterOwnershipModal';
import WithdrawTokenModal from '../actions/WithdrawModal';
import '../index.scss';


const ownershipText = (viewerAddr: string | undefined, listingInfo: IAsset) => {
  const { ownership, owner } = listingInfo;
  if (!ownership || !owner) return '';

  const viewerIsOwner = viewerAddr === owner;
  const ownershipExpired = checkOwnershipExpired(ownership.toNumber());

  let textClassname;
  let textContent;

  if (viewerIsOwner && !ownershipExpired) {
    textClassname = 'text-success';
    textContent = 'Đã sở hữu';
  } else if (viewerIsOwner && ownershipExpired) {
    textClassname = 'text-danger';
    textContent = 'Đã hết hạn sở hữu. Listing có thể bị chiếm bởi người khác!';
  } else if (!viewerIsOwner && !ownershipExpired) {
    textClassname = 'text-danger';
    textContent = 'Đã có chủ sở hữu';
  } else if (!viewerIsOwner && ownershipExpired) {
    textClassname = 'text-success';
    textContent = 'Có thể sở hữu';
  }

  return <p className={`ownership-checked m-0 ${textClassname}`}>{textContent}</p>;
};
interface IListingInfoProps {
  listingId: number;
}


const titleTableStyle = {
  textAlign: 'left',
  color: '#828282',
  fontSize: '0.875rem',
  lineHeight: '16px',
  fontWeight: '400',
};

const workerFields = [
  {
    key: 'address',
    _style: titleTableStyle,
    label: 'Address Wallet',
  },
  {
    key: 'createdDate',
    _style: titleTableStyle,
    label: 'Thời gian bắt đầu',
  },
];


const initialCollapseState: TCollapseVisibility = {
  [CollapseType.INVESTMENT]: false,
  [CollapseType.MANAGEMENT]: false,
  [CollapseType.WORKER_LIST]: false,
};

const ListingInfo = (props: IListingInfoProps) => {
  const { listingId } = props;

  const { signerAddress } = useSelector((state: RootState) => state.wallet);

  // const { extendOwnerShipSuccess, extendOwnerShipTHash } = useSelector((state: RootState) => state.listingsReducer);
  const { width: screenWidth } = useWindowDimensions();

  // const provider = getProvider();

  const { initialState } = useSelector((state: RootState) => state.assets);
  const { entityLoading } = initialState;
  const listing = useSelector(selectEntityById(listingId));

  const ownershipExpired = listing?.ownership ? checkOwnershipExpired(listing.ownership.toNumber()) : false;
  const viewerIsOwner = signerAddress && signerAddress === listing?.owner;


  const [modalsVisibility, setModalVisibility] = useState<TModalsVisibility>({
    [ModalType.OWNERSHIP_EXTENSION]: false,
    [ModalType.OWNERSHIP_WITHDRAW]: false,
    [ModalType.OWNERSHIP_REGISTER]: false,
  });

  const handleModalVisibility = (type: ModalType, isVisible: boolean) => {
    setModalVisibility({ ...modalsVisibility, [type]: isVisible });
  };


  const [collapseVisibility, setCollapseVisibility] = useState<TCollapseVisibility>(initialCollapseState);

  const toggleCollapseVisibility = (type: CollapseType) => () => {
    if (!signerAddress) return ToastError('Bạn chưa liên kết với ví của mình');

    setCollapseVisibility({ ...initialCollapseState, [type]: !collapseVisibility[type] });
  };

  const workerListing: IWorkerPermission[] = [
    {
      address: 'h1-0xda3ac...9999',
      createdDate: 'h1-17:10- 29/11/2021',
      status: WorkerStatus.true,
    },
    {
      address: 'h2-0xda3ac...9999',
      createdDate: 'h2-17:10- 29/11/2021',
      status: WorkerStatus.true,
    },
    {
      address: '0xda3ac...9999',
      createdDate: '17:10- 29/11/2021',
      status: WorkerStatus.false,
    },
  ];

  const workerActiveListing = workerListing.filter((e) => e.status === WorkerStatus.true);

  // listing
  return (
    <CContainer fluid className="px-0">
      <CCol xs={12} className="p-0">
        {!entityLoading && listing ? (
          <img src={listing.images} className="w-100 h-100" alt="listingImg" />
        ) : (
          // Ensuring 16:9 ratio for image and image loader
          <InfoLoader width={screenWidth} height={screenWidth / 1.77} />
        )}
      </CCol>

      <CCol className="m-0 p-0">
        <CRow className="listing-address-info m-0 p-0">
          <CCol xs={12} className="text-dark btn-font-style mt-3">
            202 Yên Sở - Hoàng Mai - Hà Nội
          </CCol>

          <CCol xs={12} className="text-primary total-token my-3">
            {!entityLoading && listing ? (
              <p className="m-0">
                {formatBNToken(listing.value, false)} <span className="token-name">{TOKEN_SYMBOL}</span>
              </p>
            ) : (
              <InfoLoader width={300} height={29} />
            )}
          </CCol>

          <CCol xs={6} className=" mb-3">
            {!entityLoading && listing?.ownership ? (
              ownershipText(signerAddress, listing)
            ) : (
              <InfoLoader width={300} height={29} />
            )}
          </CCol>
        </CRow>
        <CRow className="p-0 m-0">
          <CCol xs={6}>
            <p className="detail-title-font my-2">Blockchain address</p>

            {!entityLoading && listing?.address ? (
              <CTooltip content="Copied" placement="bottom">
                <CopyToClipboard text={listing.address}>
                  <p className="my-2 value-text copy-address">
                    {getEllipsisTxt(listing.address)}
                    <CButton className="p-0 pb-3 ml-1">
                      <CIcon name="cil-copy" size="sm" />
                    </CButton>
                  </p>
                </CopyToClipboard>
              </CTooltip>
            ) : (
              <InfoLoader width={155} height={27} />
            )}
          </CCol>

          <CCol xs={6}>
            <p className="detail-title-font my-2">The current owner</p>

            {!entityLoading && listing?.owner ? (
              <CTooltip content="Copied" placement="bottom">
                <CopyToClipboard text={listing.owner || ''}>
                  <p className="my-2 value-text copy-address">
                    {getEllipsisTxt(listing.owner || '')}
                    <CButton className="p-0 pb-3 ml-1">
                      <CIcon name="cil-copy" size="sm" />
                    </CButton>
                  </p>
                </CopyToClipboard>
              </CTooltip>
            ) : (
              <InfoLoader width={155} height={27} />
            )}
          </CCol>

          <CCol xs={6}>
            <p className="detail-title-font my-2">Sở hữu tới </p>
            {!entityLoading && listing?.ownership ? (
              <p className={`my-2 value-text ${ownershipExpired ? 'text-danger' : 'text-success'}`}>
                {convertUnixToDate(listing.ownership.toNumber())}
              </p>
            ) : (
              <InfoLoader width={155} height={27} />
            )}
          </CCol>

          <CCol xs={6}>
            <p className="detail-title-font my-2">Daily payment</p>

            {!entityLoading && listing?.dailyPayment ? (
              <p className="my-2 value-text">
                {formatBNToken(listing.dailyPayment, false)} <span className="token-name">ANFT</span>
              </p>
            ) : (
              <InfoLoader width={155} height={27} />
            )}
          </CCol>

          <CCol xs={6}>
            <p className="detail-title-font my-2">Total Stake</p>
            {!entityLoading && listing?.totalStake ? (
              <p className="text-primary my-2 value-text">
                {formatBNToken(listing.totalStake, false)} <span className="token-name">ANFT</span>
              </p>
            ) : (
              <InfoLoader width={155} height={27} />
            )}
          </CCol>

          <CCol xs={6}>
            <p className="detail-title-font my-2">Reward Pool</p>
            {!entityLoading && listing?.rewardPool ? (
              <p className="my-2 value-text">
                {formatBNToken(listing.rewardPool, false)} <span className="token-name">ANFT</span>
              </p>
            ) : (
              <InfoLoader width={155} height={27} />
            )}
          </CCol>

          <CCol xs={12} className="text-center">
            <p className="text-primary my-2" onClick={toggleCollapseVisibility(CollapseType.WORKER_LIST)}>
              <FontAwesomeIcon icon={faIdBadge} /> <u>Xem quyền khai thác</u>
            </p>
          </CCol>

          <CCol xs={12}>
            <CCollapse show={collapseVisibility.WORKER_LIST}>
              <CRow>
                <CCol xs={12}>
                  <CDataTable
                    striped
                    items={workerActiveListing}
                    fields={workerFields}
                    responsive
                    hover
                    header
                    scopedSlots={{
                      address: ({ address }: IWorkerPermission) => {
                        return <td>{address ? address : '_'}</td>;
                      },
                      createdDate: ({ createdDate }: IWorkerPermission) => {
                        return <td>{createdDate ? createdDate : '_'}</td>;
                      },
                    }}
                  />
                </CCol>
              </CRow>
            </CCollapse>
          </CCol>

          <CCol xs={12} className="mt-2 ">
            <CButton
              className="px-3 w-100 btn-radius-50 btn-font-style btn btn-outline-primary"
              onClick={toggleCollapseVisibility(CollapseType.INVESTMENT)}
            >
              Hoạt động đầu tư
            </CButton>
          </CCol>

          <CCol xs={12}>
            <CCollapse show={collapseVisibility.INVESTMENT}>
              <CCard className="activities-card mt-2 mb-0">
                <CCardBody className="p-2">
                  <CRow className="mx-0">
                    <p
                      onClick={() => handleModalVisibility(ModalType.OWNERSHIP_REGISTER, true)}
                      className={`m-0 text-primary`}
                    >
                      <FontAwesomeIcon icon={faEdit} /> Đăng ký sở hữu
                    </p>
                  </CRow>
                  <CRow className="mt-2 mx-0">
                    <CLink to="/register">
                      <FontAwesomeIcon icon={faDonate} /> Đăng ký nhận thưởng
                    </CLink>
                  </CRow>
                </CCardBody>
              </CCard>
            </CCollapse>
          </CCol>

          <CCol xs={12} className="mt-2">
            <CButton
              className={`px-3 w-100 btn-radius-50 btn-font-style btn btn-primary ${
                viewerIsOwner ? 'd-block' : 'd-none'
              }`}
              onClick={toggleCollapseVisibility(CollapseType.MANAGEMENT)}
            >
              Quản lý sở hữu
            </CButton>
          </CCol>

          <CCol xs={12}>
            <CCollapse show={collapseVisibility.MANAGEMENT}>
              <CCard className="mt-2 activities-card mb-0">
                <CCardBody className="p-2">
                  <CRow className="mx-0">
                    <CLink
                      href="#"
                      target="_blank"
                      onClick={() => handleModalVisibility(ModalType.OWNERSHIP_WITHDRAW, true)}
                    >
                      <FontAwesomeIcon icon={faArrowAltCircleUp} /> Rút ANFT
                    </CLink>
                  </CRow>
                  <CRow className="my-2 mx-0">
                    <p
                      onClick={() => handleModalVisibility(ModalType.OWNERSHIP_EXTENSION, true)}
                      className={`m-0 text-primary`}
                    >
                      <FontAwesomeIcon icon={faArrowAltCircleDown} /> Nạp thêm
                    </p>
                  </CRow>
                  <CRow className="mx-0">
                    <CLink to="/workers-list">
                      <FontAwesomeIcon icon={faClipboard} /> Quản lý quyền khai thác
                    </CLink>
                  </CRow>
                </CCardBody>
              </CCard>
            </CCollapse>
          </CCol>



          <RegisterOwnershipModal
            listingId={listingId}
            isVisible={modalsVisibility[ModalType.OWNERSHIP_REGISTER]}
            setVisibility={(key: boolean) => handleModalVisibility(ModalType.OWNERSHIP_REGISTER, key)}
          />
          <ExtendOwnershipModal
            isVisible={modalsVisibility[ModalType.OWNERSHIP_EXTENSION]}
            setVisibility={(key: boolean) => handleModalVisibility(ModalType.OWNERSHIP_EXTENSION, key)}
          />
          <WithdrawTokenModal
            isVisible={modalsVisibility[ModalType.OWNERSHIP_WITHDRAW]}
            setVisibility={(key: boolean) => handleModalVisibility(ModalType.OWNERSHIP_WITHDRAW, key)}
          />
        </CRow>
      </CCol>
    </CContainer>
  );
};

export default ListingInfo;