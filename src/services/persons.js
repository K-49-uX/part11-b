import axios from 'axios';


const baseUrl = `${import.meta.env.VITE_API_URL || ''}/api/persons`;

const getAll = () => axios.get(baseUrl).then(res => res.data);

const create = (newPerson) =>
  axios.post(baseUrl, newPerson).then(res => res.data);

const update = (id, updatedPerson) =>
  axios.put(`${baseUrl}/${id}`, updatedPerson).then(res => res.data);

const deletePerson = (id) =>
  axios.delete(`${baseUrl}/${id}`);

export default {
  getAll,
  create,
  update,
  delete: deletePerson
};
