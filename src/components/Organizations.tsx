import { useEffect, useState } from 'react';
import { fetchOrganizations } from '../data/api.js';
import { Organization } from "../types/index.js";

export function Organizations() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);  

  useEffect(() => {
    fetchOrganizations().then(data => setOrganizations(data));
  }, []);

  return (
    <div>
      <h1>Lista de Órgãos</h1>
      <ul>
        {organizations.map((org, index) => (
          <li key={index}>{org.nome} - {org.sigla}</li>  
        ))}
      </ul>
    </div>
  );
}
