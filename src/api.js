import axios from "axios";

const API_BASE = "https://quizappbackend-1p04.onrender.com";

export const api = axios.create({
  baseURL: API_BASE,
});
