import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Login from "./pages/Login";
import AppLayout from "./layouts/AppLayout";
import ProtectedRoute from "./routes/ProtectedRoute";

import AdminDashboard, { liensAdmin } from "./pages/admin/Dashboard";
//Directeur
import DirecteurDashboard, { liensDirecteur } from "./pages/directeur/Dashboard";
import DirecteurEnseignants from "./pages/directeur/Enseignants";
import DirecteurClasses from "./pages/directeur/Classes";
import DirecteurBulletins from "./pages/directeur/Bulletins";
import DirecteurFinances from "./pages/directeur/Finances";



//Secretaire
import SecretaireDashboard, { liensSecretaire } from "./pages/secretaire/Dashboard";
import SecretaireClasses from "./pages/secretaire/Classes";
import SecretaireEleves from "./pages/secretaire/Eleves";
import SecretaireMatieres from "./pages/secretaire/Matiere";
import SecretaireBulletins from "./pages/secretaire/Bulletins";
import SecretaireEmploiDuTemps from "./pages/secretaire/EmploiDuTemps";


//Comptable
import ComptableDashboard, { liensComptable } from "./pages/comptable/Dashboard";
import ComptablePaiements from "./pages/comptable/Paiements";




//Enseignant
import EnseignantDashboard, { liensEnseignant } from "./pages/enseignant/Dashboard";


import EnseignantNotes from "./pages/enseignant/Notes";
import EnseignantClasses from "./pages/enseignant/Classes";



import SurveillantDashboard, { liensSurveillant } from "./pages/surveillant/Dashboard";
import EleveDashboard, { liensEleve } from "./pages/eleve/Dashboard";
import TuteurDashboard, { liensTuteur } from "./pages/tuteur/Dashboard";


//Surveillant
import SurveillantClasses from "./pages/surveillant/Classes";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/connexion" element={<Login />} />

        <Route
          element={
            <ProtectedRoute role="admin">
              <AppLayout liens={liensAdmin} sousTitre="Administration" />
            </ProtectedRoute>
          }
        >
          <Route path="/admin" element={<AdminDashboard />} />
        </Route>

          

        <Route
          element={
            <ProtectedRoute role="direction">
              <AppLayout liens={liensDirecteur} sousTitre="Direction" />
            </ProtectedRoute>
          }
        >
          <Route path="/directeur" element={<DirecteurDashboard />} />
          <Route path="/directeur/classes" element={<DirecteurClasses />} />
          <Route path="/directeur/bulletins" element={<DirecteurBulletins />} />
          <Route path="/directeur/enseignants" element={<DirecteurEnseignants />} />
          <Route path="/directeur/finances" element={<DirecteurFinances />} />
        </Route>

        <Route
          element={
            <ProtectedRoute role="secretaire">
              <AppLayout liens={liensSecretaire} sousTitre="Secrétariat" />
            </ProtectedRoute>
          }
        >
          <Route path="/secretaire" element={<SecretaireDashboard />} />
          <Route path="/secretaire/classes" element={<SecretaireClasses />} />
          <Route path="/secretaire/eleves" element={<SecretaireEleves />} />
          <Route path="/secretaire/matieres" element={<SecretaireMatieres />} />
          <Route path="/secretaire/bulletins" element={<SecretaireBulletins />} />
          <Route path="/secretaire/emploi-du-temps" element={<SecretaireEmploiDuTemps />} />
        </Route>

        <Route
          element={
            <ProtectedRoute role="comptable">
              <AppLayout liens={liensComptable} sousTitre="Comptabilité" />
            </ProtectedRoute>
          }
        >
          <Route path="/comptable" element={<ComptableDashboard />} />
          <Route path="/comptable/paiements" element={<ComptablePaiements />} />
        </Route>

        <Route
          element={
            <ProtectedRoute role="enseignant">
              <AppLayout liens={liensEnseignant} sousTitre="Enseignant" />
            </ProtectedRoute>
          }
        >
          <Route path="/enseignant" element={<EnseignantDashboard />} />
          <Route path="/enseignant/notes" element={<EnseignantNotes />} />
          <Route path="/enseignant/classes" element={<EnseignantClasses />} />
        </Route>

        <Route
          element={
            <ProtectedRoute role="surveillant">
              <AppLayout liens={liensSurveillant} sousTitre="Surveillance" />
            </ProtectedRoute>
          }
        >
          <Route path="/surveillant" element={<SurveillantDashboard />} />
          <Route path="/surveillant/classe" element={<SurveillantClasses />} />
        </Route>

        <Route
          element={
            <ProtectedRoute role="eleve">
              <AppLayout liens={liensEleve} sousTitre="Mon espace" />
            </ProtectedRoute>
          }
        >
          <Route path="/eleve" element={<EleveDashboard />} />
        </Route>

        <Route
          element={
            <ProtectedRoute role="parent">
              <AppLayout liens={liensTuteur} sousTitre="Espace parent" />
            </ProtectedRoute>
          }
        >
          <Route path="/tuteur" element={<TuteurDashboard />} />
        </Route>

        <Route path="*" element={<Navigate to="/connexion" replace />} />
      </Routes>
    </BrowserRouter>
  );
}