import CIcon from '@coreui/icons-react';
import { CLink, CSidebar, CSidebarBrand, CSidebarFooter, CTooltip } from '@coreui/react';
import { faGlobe, faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import Logo from '../assets/img/logo.png';
import { formatBNToken } from '../shared/casual-helpers';
import { Dropdown } from '../shared/enumeration/dropdown';
import { Language } from '../shared/enumeration/language';
import useDeviceDetect from '../shared/hooks/useDeviceDetect';
import { RootState } from '../shared/reducers';
import { logout, setLoginModalVisible } from '../views/auth/auth.reducer';
import { toggleSidebar } from './reducer';

interface DropdownState {
  [Dropdown.LANGUAGE]: boolean;
}

const intialDDState: DropdownState = {
  [Dropdown.LANGUAGE]: false,
};

const TheSidebar = () => {
  const location = useLocation().pathname;
  const dispatch = useDispatch();
  const { isMobile } = useDeviceDetect();
  const { user } = useSelector((state: RootState) => state.authentication);
  const containerState = useSelector((state: RootState) => state.container);
  const { sidebarShow } = containerState;
  const { tokenBalance, signerAddress } = useSelector((state: RootState) => state.wallet);

  const { i18n, t } = useTranslation();

  const changeLanguageI18n = (lang: Language) => () => {
    i18n.changeLanguage(lang);
  };

  const [ddState, setDDStates] = useState<DropdownState>(intialDDState);
  const setDDCurrying =
    (key: Dropdown, value: boolean): React.MouseEventHandler<HTMLAnchorElement> =>
    (): void =>
      setDDStates({ ...ddState, [key]: value });

  const { LANGUAGE } = ddState;

  useEffect(() => {
    if (sidebarShow === 'responsive') {
      setDDStates({ ...intialDDState, LANGUAGE: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sidebarShow]);

  const highlightNavItem = (path: string): 'c-active text-primary' | '' => {
    if (path === '/') return '';
    return location.includes(path) ? 'c-active text-primary' : '';
  };

  return (
    <CSidebar
      className={`c-sidebar-light text-sm border-0 ${isMobile ? '' : 'd-lg-none'}`}
      show={sidebarShow}
      unfoldable
      onShowChange={(val: boolean) => {
        console.log(val, 'onShowChange');
        dispatch(toggleSidebar(val));
      }}
    >
      <CSidebarBrand>ANFT D-APP</CSidebarBrand>
      <ul className="c-sidebar-nav h-100 ps">
        <li className={`c-sidebar-nav-item `}>
          <CLink className={`c-sidebar-nav-link ${highlightNavItem('/listings')}`} to={'/listings'}>
            <CIcon name="cil-home" size="lg" className={`c-sidebar-nav-icon text-primary`} />{' '}
            {t('anftDapp.headerComponent.dashboard')}
          </CLink>
        </li>
        <li className={`c-sidebar-nav-item `}>
          <CLink className={`c-sidebar-nav-link ${highlightNavItem('/logs-overview')}`} to={'/logs-overview'}>
            <CIcon name="cil-history" size="lg" className={`c-sidebar-nav-icon text-primary`} />{' '}
            {t('anftDapp.listingComponent.activityLogs')}
          </CLink>
        </li>
        <li className={`c-sidebar-nav-item`}>
          <CLink
            className={`c-sidebar-nav-link`}
            target="_blank"
            rel="noreferrer noopener"
            href="https://dapp-guide.anfteco.io"
          >
            <CIcon name="cil-book" size="lg" className={`c-sidebar-nav-icon text-primary`} />{' '}
            {t('anftDapp.sidebarComponent.userGuide')}
          </CLink>
        </li>
        <li className={`c-sidebar-nav-dropdown ${LANGUAGE ? 'c-show' : ''}`}>
          <CLink className="c-sidebar-nav-dropdown-toggle" onClick={setDDCurrying(Dropdown.LANGUAGE, !LANGUAGE)}>
            <FontAwesomeIcon icon={faGlobe} size="lg" className="c-sidebar-nav-icon text-primary" />
            {t('anftDapp.sidebarComponent.language.language')}
          </CLink>
          <ul className="c-sidebar-nav-dropdown-items">
            <li className={`c-sidebar-nav-item `}>
              <CLink
                className={`c-sidebar-nav-link ${i18n.language.includes(Language.vi) ? 'text-primary' : ''}`}
                onClick={changeLanguageI18n(Language.vi)}
              >
                {t('anftDapp.sidebarComponent.language.vietnamese')}
                <CIcon name="cif-vn" size="lg" className={`ml-1`} />
              </CLink>
            </li>
            <li className={`c-sidebar-nav-item`}>
              <CLink
                className={`c-sidebar-nav-link ${i18n.language.includes(Language.en) ? 'text-primary' : ''}`}
                onClick={changeLanguageI18n(Language.en)}
              >
                {t('anftDapp.sidebarComponent.language.english')}
                <CIcon name="cif-us" size="lg" className={`ml-1`} />
              </CLink>
            </li>
          </ul>
        </li>
        <li className={`c-sidebar-nav-item`}>
          <CLink
            className={`c-sidebar-nav-link`}
            to=""
            onClick={() => (!user ? dispatch(setLoginModalVisible(true)) : dispatch(logout()))}
          >
            <CIcon name="cil-user" size="lg" className={`c-sidebar-nav-icon text-primary`} />{' '}
            <div className={'d-flex justify-content-between align-items-center w-100'}>
              <span>{user ? user.login : t('anftDapp.sidebarComponent.remAccount')}</span>
              {user ? <CIcon name="cil-account-logout" className="text-danger rotate-180" /> : ''}
            </div>
          </CLink>
        </li>
      </ul>
      <CSidebarFooter className={`text-center bg-white`}>
        <span className="text-primary">
          <CIcon src={Logo} height={30} />
          {signerAddress && tokenBalance ? (
            <>
              <span className="mx-1">{formatBNToken(tokenBalance, false)}</span>
              <CTooltip placement="top" content={t('anftDapp.listingComponent.extendOwnership.tokenBalance')}>
                <FontAwesomeIcon icon={faInfoCircle} size="sm" />
              </CTooltip>
            </>
          ) : (
            ''
          )}
        </span>
      </CSidebarFooter>
    </CSidebar>
  );
};

export default React.memo(TheSidebar);
