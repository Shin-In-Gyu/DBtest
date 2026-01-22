import Constants from "expo-constants";

const debuggerHost = Constants.expoConfig?.hostUri;
const localhost = debuggerHost ? debuggerHost.split(":")[0] : "localhost";

const API_HOST = `http://${localhost}:8000`;

const KNU_API_BASE = `${API_HOST}/api/knu`.replace(/([^:]\/)\/+/g, "$1");

export default KNU_API_BASE;
