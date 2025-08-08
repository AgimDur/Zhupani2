import React from 'react';
import { Box, Typography, Card, CardContent, Alert } from '@mui/material';

const Admin: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Admin-Bereich
      </Typography>
      
      <Card>
        <CardContent>
          <Alert severity="info">
            Der Admin-Bereich wird hier implementiert.
          </Alert>
          
          <Typography variant="body1" sx={{ mt: 2 }}>
            Hier können Sie:
          </Typography>
          <ul>
            <li>Benutzer verwalten</li>
            <li>Familien verwalten</li>
            <li>System-Einstellungen konfigurieren</li>
            <li>Statistiken einsehen</li>
            <li>Backup und Wartung durchführen</li>
          </ul>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Admin;
