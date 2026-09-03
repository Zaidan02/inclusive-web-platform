import { Link } from "react-router-dom";
import LanguageSwitcher from "../localization/LanguageSwitcher";

export default function AuthUtilityBar() {
  return (
    <div className="auth-utility-bar">
      <Link to="/" className="auth-utility-bar__home">JoIn Hospitality</Link>
      <LanguageSwitcher compact />
    </div>
  );
}
