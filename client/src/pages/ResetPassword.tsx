import React from 'react';
import { Box, Typography, Card, CardContent, Alert } from '@mui/material';

const ResetPassword: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Passwort zurücksetzen
      </Typography>
      
      <Card>
        <CardContent>
          <Alert severity="info">
            Die Passwort-Zurücksetzung wird hier implementiert.
          </Alert>
          
          <Typography variant="body1" sx={{ mt: 2 }}>
            Hier können Sie:
          </Typography>
          <ul>
            <li>Neues Passwort eingeben</li>
            <li>Passwort bestätigen</li>
            <li>Anmeldung mit neuem Passwort</li>
          </ul>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ResetPassword;
