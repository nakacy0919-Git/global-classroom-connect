// Host-assisted request workflow. No authentication or database access here.
export const REQUEST_STATUSES = Object.freeze(['pending','approved','declined']);

export function eligibleRequesters(teachers, offer) {
  return (teachers || []).filter(teacher =>
    teacher?.id && teacher.id !== offer?.teacher_id &&
    teacher.schools?.country_code && teacher.schools?.name
  ).sort((a, b) => (a.display_name || '').localeCompare(b.display_name || ''));
}

export function requestForPair(requests, offerId, teacherId) {
  return (requests || []).find(request =>
    request.offer_id === offerId && request.requesting_teacher_id === teacherId
  ) || null;
}

export function canDecideRequest(request) {
  return request?.status === 'pending';
}

export function requestCounts(requests) {
  const all = requests || [];
  return {
    total: all.length,
    pending: all.filter(r => r.status === 'pending').length,
    approved: all.filter(r => r.status === 'approved').length,
    declined: all.filter(r => r.status === 'declined').length
  };
}
