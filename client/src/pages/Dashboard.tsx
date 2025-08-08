import React from 'react';
import { useQuery } from 'react-query';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  People,
  AccountTree,
  Forum,
  PersonAdd,
  Link,
  Comment,
  Article,
} from '@mui/icons-material';
import { apiService } from '../services/api';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

const Dashboard: React.FC = () => {
  const { data: families, isLoading: familiesLoading } = useQuery(
    'families',
    () => apiService.getFamilies().then(res => res.data.families)
  );

  const { data: persons, isLoading: personsLoading } = useQuery(
    'persons',
    () => apiService.getPersons().then(res => res.data.persons)
  );

  const { data: posts, isLoading: postsLoading } = useQuery(
    'posts',
    () => apiService.getPosts({ limit: 5 }).then(res => res.data.posts)
  );

  const isLoading = familiesLoading || personsLoading || postsLoading;

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  const totalFamilies = families?.length || 0;
  const totalPersons = persons?.length || 0;
  const totalPosts = posts?.length || 0;

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'person_added':
        return <PersonAdd color="primary" />;
      case 'relationship_created':
        return <Link color="secondary" />;
      case 'post_created':
        return <Article color="success" />;
      case 'comment_added':
        return <Comment color="info" />;
      default:
        return <PersonAdd />;
    }
  };

  const getActivityText = (type: string) => {
    switch (type) {
      case 'person_added':
        return 'Person hinzugefügt';
      case 'relationship_created':
        return 'Beziehung erstellt';
      case 'post_created':
        return 'Beitrag erstellt';
      case 'comment_added':
        return 'Kommentar hinzugefügt';
      default:
        return 'Aktivität';
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <People sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4" component="div">
                    {totalFamilies}
                  </Typography>
                  <Typography color="text.secondary">
                    Familien
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <AccountTree sx={{ fontSize: 40, color: 'secondary.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4" component="div">
                    {totalPersons}
                  </Typography>
                  <Typography color="text.secondary">
                    Familienmitglieder
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Forum sx={{ fontSize: 40, color: 'success.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4" component="div">
                    {totalPosts}
                  </Typography>
                  <Typography color="text.secondary">
                    Beiträge
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Recent Activity and Quick Actions */}
      <Grid container spacing={3}>
        {/* Recent Posts */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Neueste Beiträge
              </Typography>
              {posts && posts.length > 0 ? (
                <List>
                  {posts.map((post: any) => (
                    <ListItem key={post.id} divider>
                      <ListItemIcon>
                        <Article color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary={post.title}
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              Von {post.author_first_name} {post.author_last_name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {format(new Date(post.created_at), 'dd.MM.yyyy HH:mm', { locale: de })}
                            </Typography>
                            <Chip
                              label={post.visibility}
                              size="small"
                              sx={{ ml: 1 }}
                              color={post.visibility === 'public' ? 'success' : 'default'}
                            />
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Alert severity="info">
                  Noch keine Beiträge vorhanden.
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Family Members */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Neueste Familienmitglieder
              </Typography>
              {persons && persons.length > 0 ? (
                <List>
                  {persons.slice(0, 5).map((person: any) => (
                    <ListItem key={person.id} divider>
                      <ListItemIcon>
                        <PersonAdd color="secondary" />
                      </ListItemIcon>
                      <ListItemText
                        primary={`${person.first_name} ${person.last_name}`}
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              {person.family_name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {person.birth_date && format(new Date(person.birth_date), 'dd.MM.yyyy', { locale: de })}
                            </Typography>
                            <Chip
                              label={person.gender}
                              size="small"
                              sx={{ ml: 1 }}
                              color={person.gender === 'male' ? 'primary' : 'secondary'}
                            />
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Alert severity="info">
                  Noch keine Familienmitglieder vorhanden.
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Welcome Message */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Willkommen bei Zhupani Family Tree!
          </Typography>
          <Typography variant="body1" paragraph>
            Hier können Sie Ihre Familiengeschichte entdecken und verwalten. 
            Erstellen Sie Stammbäume, fügen Sie Familienmitglieder hinzu und 
            teilen Sie Geschichten mit Ihrer Familie.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Nutzen Sie die Navigation links, um zu den verschiedenen Bereichen zu gelangen.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Dashboard;
