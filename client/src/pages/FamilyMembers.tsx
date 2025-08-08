import React from 'react';
import { Box, Typography, Card, CardContent, Alert } from '@mui/material';

const FamilyMembers: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Familienmitglieder
      </Typography>
      
      <Card>
        <CardContent>
          <Alert severity="info">
            Die Familienmitglieder-Verwaltung wird hier implementiert.
          </Alert>
          
          <Typography variant="body1" sx={{ mt: 2 }}>
            Hier können Sie:
          </Typography>
          <ul>
            <li>Familienmitglieder hinzufügen und bearbeiten</li>
            <li>Personeninformationen verwalten</li>
            <li>Fotos hochladen</li>
            <li>Beziehungen zwischen Personen erstellen</li>
            <li>Nach Familien filtern</li>
          </ul>
        </CardContent>
      </Card>
    </Box>
  );
};

export default FamilyMembers;
