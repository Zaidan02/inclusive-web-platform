import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import logo from "../../assets/john-logo.png";

export default function Brand({ light = false }) {
  const { t } = useTranslation("common");
  return (
    <Link className={`brand ${light ? "brand--light" : ""}`} to="/" aria-label={t("brand.home")}>
      <span className="brand__mark"><img src={logo} alt="" /></span>
      <span className="brand__copy"><strong>JoIn</strong><small>Hospitality</small></span>
    </Link>
  );
}
