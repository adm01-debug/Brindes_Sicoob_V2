import { buildAuthedRouteSuite } from "../_factories";
buildAuthedRouteSuite({ name: "/admin/seguranca", path: "/admin/seguranca", primary: { kind: "rest", key: "login_attempts", successBody: [] } });
