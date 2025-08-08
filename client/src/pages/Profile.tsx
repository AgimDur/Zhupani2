import React from 'react';
import { Box, Typography, Card, CardContent, Alert } from '@mui/material';

const Profile: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Profil
      </Typography>
      
      <Card>
        <CardContent>
          <Alert severity="info">
            Die Profil-Verwaltung wird hier implementiert.
          </Alert>
          
          <Typography variant="body1" sx={{ mt: 2 }}>
            Hier können Sie:
          </Typography>
          <ul>
            <li>Persönliche Informationen bearbeiten</li>
            <li>Passwort ändern</li>
            <li>E-Mail-Einstellungen verwalten</li>
            <li>Benachrichtigungen konfigurieren</li>
            <li>Konto-Einstellungen anpassen</li>
          </ul>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Profile;
