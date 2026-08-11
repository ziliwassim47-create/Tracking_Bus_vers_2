'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { once } = require('events');
const { DatabaseSync } = require('node:sqlite');

const projectRoot = path.resolve(__dirname, '..');
const port = 9300 + (process.pid % 200);
const baseUrl = `http://127.0.0.1:${port}/api`;
const testDb = path.join(projectRoot, 'data', `tracking-bus-test-${process.pid}.sqlite`);

async function waitForServer() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) return;
    } catch (_) {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('Le serveur de test ne répond pas');
}

async function request(endpoint, options = {}, token) {
  const response = await fetch(`${baseUrl}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });
  const payload = response.status === 204 ? {} : await response.json();
  return { response, payload };
}

async function login(email) {
  const { response, payload } = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password: 'demo1234' })
  });
  assert.equal(response.status, 200);
  return payload;
}

async function loginByPhone(phone, password = 'demo1234') {
  const { response, payload } = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ phone, password })
  });
  return { response, payload };
}

test('API métier et persistance SQLite', async t => {
  fs.rmSync(testDb, { force: true });
  const server = spawn(process.execPath, ['server.js'], {
    cwd: projectRoot,
    env: {
      ...process.env,
      PORT: String(port),
      DB_PATH: testDb,
      ACCESS_TOKEN_TTL_MS: '2000',
      SESSION_TTL_MS: '3500'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let stderr = '';
  server.stderr.on('data', chunk => { stderr += chunk; });
  t.after(async () => {
    server.kill();
    if (server.exitCode === null) await once(server, 'exit');
    fs.rmSync(testDb, { force: true });
    fs.rmSync(`${testDb}-shm`, { force: true });
    fs.rmSync(`${testDb}-wal`, { force: true });
  });

  await waitForServer();

  const health = await request('/health');
  assert.equal(health.response.status, 200);
  assert.ok(health.payload.instance_id);

  const parent = await login('parent@demo.tn');
  const assistant = await login('assistant@demo.tn');
  const admin = await login('admin@demo.tn');
  const unassignedDriver = await login('nabil@demo.tn');
  const unassignedAssistant = await login('ines@demo.tn');

  assert.equal(parent.user.role, 'PARENT');
  assert.equal(parent.server_instance_id, health.payload.instance_id);
  assert.equal(assistant.user.role, 'ASSISTANT');
  assert.equal(admin.user.role, 'ADMIN');

  const parentBootstrap = await request('/bootstrap', {}, parent.token);
  assert.equal(parentBootstrap.response.status, 200);
  assert.equal(parentBootstrap.payload.students.length, 3);
  assert.equal(parentBootstrap.payload.tripStops.length, 5);
  assert.equal(parentBootstrap.payload.currentTrip.status, 'IN_PROGRESS');

  const assistantBootstrap = await request('/bootstrap', {}, assistant.token);
  assert.equal(assistantBootstrap.response.status, 200);
  assert.equal(assistantBootstrap.payload.user.role, 'ASSISTANT');
  assert.equal(assistantBootstrap.payload.currentTrip.assistant_id, assistant.user.id);

  const unauthorizedGps = await request('/gps', {
    method: 'POST',
    body: JSON.stringify({
      trip_id: parentBootstrap.payload.currentTrip.id,
      latitude: 36.81,
      longitude: 10.18
    })
  }, unassignedDriver.token);
  assert.equal(unauthorizedGps.response.status, 403);

  const unauthorizedEvent = await request('/student-events', {
    method: 'POST',
    body: JSON.stringify({
      trip_id: parentBootstrap.payload.currentTrip.id,
      student_id: parentBootstrap.payload.students[0].id,
      event_type: 'BOARDED'
    })
  }, unassignedAssistant.token);
  assert.equal(unauthorizedEvent.response.status, 403);

  const authorizedGps = await request('/gps', {
    method: 'POST',
    body: JSON.stringify({
      trip_id: parentBootstrap.payload.currentTrip.id,
      latitude: 36.81,
      longitude: 10.18
    })
  }, assistant.token);
  assert.equal(authorizedGps.response.status, 201);

  const eventResult = await request('/student-events', {
    method: 'POST',
    body: JSON.stringify({
      trip_id: parentBootstrap.payload.currentTrip.id,
      student_id: parentBootstrap.payload.students[0].id,
      event_type: 'BOARDED'
    })
  }, assistant.token);
  assert.equal(eventResult.response.status, 201);

  const adminBootstrap = await request('/bootstrap', {}, admin.token);
  assert.equal(adminBootstrap.response.status, 200);
  assert.equal(adminBootstrap.payload.user.role, 'ADMIN');
  assert.ok(adminBootstrap.payload.users.length >= 7);

  const createdParent = await request('/users', {
    method: 'POST',
    body: JSON.stringify({
      role: 'PARENT', first_name: 'Parent', last_name: 'Téléphone',
      email: 'parent.phone@test.tn', phone: '+216 55 123 456', password: 'parentSecret!'
    })
  }, admin.token);
  assert.equal(createdParent.response.status, 201);

  const createdAssistant = await request('/users', {
    method: 'POST',
    body: JSON.stringify({
      role: 'ASSISTANT', first_name: 'Assistante', last_name: 'Test',
      email: 'assistante.creation@test.tn', phone: '+216 55 123 457', password: 'demo1234'
    })
  }, admin.token);
  assert.equal(createdAssistant.response.status, 201);

  const createdAdmin = await request('/users', {
    method: 'POST',
    body: JSON.stringify({
      role: 'ADMIN', first_name: 'Admin', last_name: 'Test',
      email: 'admin.creation@test.tn', phone: '+216 55 123 458', password: 'demo1234'
    })
  }, admin.token);
  assert.equal(createdAdmin.response.status, 201);

  const parentPhoneLogin = await loginByPhone('55 123 456', 'parentSecret!');
  assert.equal(parentPhoneLogin.response.status, 200);
  assert.equal(parentPhoneLogin.payload.user.role, 'PARENT');
  assert.equal(parentPhoneLogin.payload.user.id, createdParent.payload.id);
  const wrongParentPassword = await loginByPhone('+21655123456', 'incorrect');
  assert.equal(wrongParentPassword.response.status, 401);
  const assistantPhoneLogin = await loginByPhone('55123457');
  assert.equal(assistantPhoneLogin.response.status, 200);
  assert.equal(assistantPhoneLogin.payload.user.role, 'ASSISTANT');
  const createdAdminLogin = await login('admin.creation@test.tn');
  assert.equal(createdAdminLogin.user.role, 'ADMIN');

  const duplicatePhone = await request('/users', {
    method: 'POST',
    body: JSON.stringify({
      role: 'PARENT', first_name: 'Doublon', last_name: 'Téléphone',
      email: 'duplicate.phone@test.tn', phone: '55123456', password: 'demo1234'
    })
  }, admin.token);
  assert.equal(duplicatePhone.response.status, 409);

  const invalidRole = await request('/users', {
    method: 'POST',
    body: JSON.stringify({
      role: 'UNKNOWN', first_name: 'Rôle', last_name: 'Invalide',
      email: 'invalid.role@test.tn', phone: '+216 55 000 099', password: 'demo1234'
    })
  }, admin.token);
  assert.equal(invalidRole.response.status, 422);

  const unassignedParent = adminBootstrap.payload.users.find(user => user.email === 'leila@demo.tn');
  const studentWithoutRoute = await request('/students', {
    method: 'POST',
    body: JSON.stringify({
      parent_id: unassignedParent.id,
      first_name: 'Sans',
      last_name: 'Ligne',
      home_address: 'Adresse de test',
      home_lat: 36.8,
      home_lng: 10.1
    })
  }, admin.token);
  assert.equal(studentWithoutRoute.response.status, 201);

  const wrongRouteEvent = await request('/student-events', {
    method: 'POST',
    body: JSON.stringify({
      trip_id: parentBootstrap.payload.currentTrip.id,
      student_id: studentWithoutRoute.payload.id,
      event_type: 'WAITING'
    })
  }, assistant.token);
  assert.equal(wrongRouteEvent.response.status, 404);

  const incidentResult = await request('/incidents', {
    method: 'POST',
    body: JSON.stringify({
      trip_id: parentBootstrap.payload.currentTrip.id,
      category: 'SAFETY',
      description: 'Test automatique de signalement.'
    })
  }, parent.token);
  assert.equal(incidentResult.response.status, 201);

  const busResult = await request('/buses', {
    method: 'POST',
    body: JSON.stringify({
      registration: 'TEST 001',
      label: 'Bus test',
      capacity: 24,
      status: 'AVAILABLE',
      gps_device_uid: 'GPS-TEST-001'
    })
  }, admin.token);
  assert.equal(busResult.response.status, 201);

  const routeWithStops = await request('/routes', {
    method: 'POST',
    body: JSON.stringify({
      code: 'TEST',
      name: 'Ligne test',
      origin: 'Départ test',
      destination: 'Arrivée test',
      morning_time: '07:15',
      afternoon_time: '16:15',
      stops: [
        { name: 'Arrêt A', address: 'Rue A', latitude: 36.8, longitude: 10.1, stop_order: 1, planned_offset_min: 0 },
        { name: 'Arrêt B', address: 'Rue B', latitude: 36.81, longitude: 10.11, stop_order: 2, planned_offset_min: 8 }
      ]
    })
  }, admin.token);
  assert.equal(routeWithStops.response.status, 201);
  assert.ok(routeWithStops.payload.id > 0);

  const stopsList = await request('/stops', {}, admin.token);
  assert.equal(stopsList.response.status, 200);
  const createdStops = stopsList.payload.filter(item => item.route_id === routeWithStops.payload.id);
  assert.equal(createdStops.length, 2);
  assert.ok(createdStops.some(item => item.name === 'Arrêt A'));
  assert.ok(createdStops.some(item => item.name === 'Arrêt B'));

  const createdChild = await request('/students', {
    method: 'POST',
    body: JSON.stringify({
      parent_id: createdParent.payload.id,
      first_name: 'Enfant', last_name: 'Téléphone', school_class: '4ème A',
      home_address: '12 rue du test', home_lat: 36.82, home_lng: 10.18
    })
  }, admin.token);
  assert.equal(createdChild.response.status, 201);

  const foreignStop = adminBootstrap.payload.stops.find(stop => stop.route_id !== routeWithStops.payload.id);
  const mismatchedStopAssignment = await request('/route-students', {
    method: 'POST',
    body: JSON.stringify({
      route_id: routeWithStops.payload.id,
      student_id: createdChild.payload.id,
      stop_id: foreignStop.id
    })
  }, admin.token);
  assert.equal(mismatchedStopAssignment.response.status, 422);

  const childRouteAssignment = await request('/route-students', {
    method: 'POST',
    body: JSON.stringify({
      route_id: routeWithStops.payload.id,
      student_id: createdChild.payload.id,
      stop_id: createdStops[0].id
    })
  }, admin.token);
  assert.equal(childRouteAssignment.response.status, 201);

  const routeStudentsList = await request('/route-students', {}, admin.token);
  assert.equal(routeStudentsList.response.status, 200);
  assert.ok(routeStudentsList.payload.some(item => item.route_id === routeWithStops.payload.id
    && item.student_id === createdChild.payload.id && item.stop_id === createdStops[0].id));

  const wrongDriverAssignment = await request('/assignments', {
    method: 'POST',
    body: JSON.stringify({
      route_id: routeWithStops.payload.id, bus_id: busResult.payload.id,
      driver_id: createdParent.payload.id, assistant_id: createdAssistant.payload.id,
      starts_on: '2026-09-01'
    })
  }, admin.token);
  assert.equal(wrongDriverAssignment.response.status, 422);

  const availableDriver = adminBootstrap.payload.users.find(item => item.role === 'DRIVER');
  const busRouteAssignment = await request('/assignments', {
    method: 'POST',
    body: JSON.stringify({
      route_id: routeWithStops.payload.id, bus_id: busResult.payload.id,
      driver_id: availableDriver.id, assistant_id: createdAssistant.payload.id,
      starts_on: '2026-09-01'
    })
  }, admin.token);
  assert.equal(busRouteAssignment.response.status, 201);

  const assignmentsList = await request('/assignments', {}, admin.token);
  assert.equal(assignmentsList.response.status, 200);
  assert.ok(assignmentsList.payload.some(item => item.id === busRouteAssignment.payload.id
    && item.route_id === routeWithStops.payload.id && item.bus_id === busResult.payload.id));

  const newParentBootstrap = await request('/bootstrap', {}, parentPhoneLogin.payload.token);
  assert.equal(newParentBootstrap.response.status, 200);
  assert.equal(newParentBootstrap.payload.students.length, 1);
  assert.equal(newParentBootstrap.payload.students[0].id, createdChild.payload.id);

  const createdUser = await request('/users', {
    method: 'POST',
    body: JSON.stringify({
      role: 'PARENT',
      first_name: 'À',
      last_name: 'Supprimer',
      email: 'delete.me@test.tn',
      phone: '+216 99 999 999',
      password_hash: 'demo1234'
    })
  }, admin.token);
  assert.equal(createdUser.response.status, 201);

  const deletedUser = await request(`/users/${createdUser.payload.id}`, { method: 'DELETE' }, admin.token);
  assert.equal(deletedUser.response.status, 200);

  const deletedUserCheck = await request(`/users/${createdUser.payload.id}`, {}, admin.token);
  assert.equal(deletedUserCheck.response.status, 200);
  assert.equal(deletedUserCheck.payload.active, 0);

  const assignedStudent = await request('/route-students', {
    method: 'POST',
    body: JSON.stringify({
      route_id: routeWithStops.payload.id,
      student_id: parentBootstrap.payload.students[0].id,
      stop_id: createdStops[0].id
    })
  }, admin.token);
  assert.equal(assignedStudent.response.status, 201);

  const registration = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      requested_role: 'PARENT',
      first_name: 'Test',
      last_name: 'Parent',
      email: 'nouveau.parent@test.tn',
      phone: '+216 99 000 000'
    })
  });
  assert.equal(registration.response.status, 201);

  const approval = await request(`/registration-requests/${registration.payload.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'APPROVED' })
  }, admin.token);
  assert.equal(approval.response.status, 200);

  const newParent = await login('nouveau.parent@test.tn');
  assert.equal(newParent.user.role, 'PARENT');

  const notificationId = parentBootstrap.payload.notifications[0].id;
  const readResult = await request(`/notifications/${notificationId}/read`, {
    method: 'PATCH'
  }, parent.token);
  assert.equal(readResult.response.status, 200);

  const expiringSession = await login('parent@demo.tn');
  assert.ok(expiringSession.refresh_token);
  assert.ok(expiringSession.expires_at);
  assert.ok(expiringSession.session_expires_at);

  await new Promise(resolve => setTimeout(resolve, 2100));
  const expiredAccess = await request('/bootstrap', {}, expiringSession.token);
  assert.equal(expiredAccess.response.status, 401);

  const firstRotation = await request('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refresh_token: expiringSession.refresh_token })
  });
  assert.equal(firstRotation.response.status, 200);
  assert.notEqual(firstRotation.payload.token, expiringSession.token);
  assert.notEqual(firstRotation.payload.refresh_token, expiringSession.refresh_token);

  const reusedRefresh = await request('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refresh_token: expiringSession.refresh_token })
  });
  assert.equal(reusedRefresh.response.status, 401);

  const secondRotation = await request('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refresh_token: firstRotation.payload.refresh_token })
  });
  assert.equal(secondRotation.response.status, 200);

  const invalidatedAccess = await request('/bootstrap', {}, firstRotation.payload.token);
  assert.equal(invalidatedAccess.response.status, 401);
  const activeAccess = await request('/bootstrap', {}, secondRotation.payload.token);
  assert.equal(activeAccess.response.status, 200);

  await new Promise(resolve => setTimeout(resolve, 1500));
  const expiredSession = await request('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refresh_token: secondRotation.payload.refresh_token })
  });
  assert.equal(expiredSession.response.status, 401);
  assert.equal(expiredSession.payload.code, 'SESSION_EXPIRED');

  const schemaDb = new DatabaseSync(testDb);
  try {
    const tables = schemaDb.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map(row => row.name);
    for (const expected of ['Utilisateur', 'Parent', 'Administrateur', 'Chauffeur', 'Assistante',
      'Bus', 'Etablissement', 'Arret', 'Trajet', 'Enfant', 'ExecutionTrajet',
      'PresenceEnfant', 'Incident', 'Reclamation', 'Notification']) {
      assert.ok(tables.includes(expected), `Table française absente: ${expected}`);
    }
    assert.equal(tables.includes('users'), false);
    assert.equal(tables.includes('students'), false);
    assert.ok(schemaDb.prepare('PRAGMA table_info(Arret)').all().some(column => column.name === 'nom'));
  } finally {
    schemaDb.close();
  }

  const htmlFiles = [path.join(projectRoot, 'www', 'index.html')];
  for (const area of ['auth', 'parent', 'assistante', 'administration']) {
    const directory = path.join(projectRoot, 'www', area);
    for (const name of fs.readdirSync(directory).filter(item => item.endsWith('.html'))) {
      htmlFiles.push(path.join(directory, name));
    }
  }
  for (const htmlFile of htmlFiles) {
    const html = fs.readFileSync(htmlFile, 'utf8');
    const prefix = path.dirname(htmlFile) === path.join(projectRoot, 'www') ? '' : '../';
    assert.ok(html.includes(`<script src="${prefix}assets/hybrid.js"></script>`),
      `Chemin hybrid.js invalide: ${htmlFile}`);
    assert.doesNotMatch(html, /<script[^>]+cordova\.js/i);
    assert.doesNotMatch(html, /src\s*\(/i);
  }

  assert.equal(stderr.includes('Error:'), false, stderr);
});
