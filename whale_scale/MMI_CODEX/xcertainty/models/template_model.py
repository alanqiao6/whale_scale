import pymc as pm

def template_model(constants, data, inits):
    """Defines a Bayesian model using PyMC for measurement and growth curve analysis."""
    
    with pm.Model() as model:
        # Measurement error model
        altimeter_bias = pm.Normal("altimeter_bias", 
                                   mu=constants['prior_altimeter_bias'][:, 0], 
                                   sigma=constants['prior_altimeter_bias'][:, 1],
                                   shape=constants['n_altimeters'])
        
        altimeter_scaling = pm.Normal("altimeter_scaling", 
                                      mu=constants['prior_altimeter_scaling'][:, 0],
                                      sigma=constants['prior_altimeter_scaling'][:, 1],
                                      shape=constants['n_altimeters'])
        
        altimeter_variance = pm.InverseGamma("altimeter_variance", 
                                             alpha=constants['prior_altimeter_variance'][:, 0],
                                             beta=constants['prior_altimeter_variance'][:, 1],
                                             shape=constants['n_altimeters'])
        
        image_altitude = pm.Uniform("image_altitude", 
                                     lower=constants['prior_image_altitude'][0],
                                     upper=constants['prior_image_altitude'][1],
                                     shape=constants['n_images'])
        
        # Altimeter measurement model
        altimeter_measurement = pm.Normal("altimeter_measurement",
                                          mu=(altimeter_bias[constants['altimeter_measurement_type']] +
                                              image_altitude[constants['altimeter_measurement_image']] *
                                              altimeter_scaling[constants['altimeter_measurement_type']]),
                                          sigma=pm.math.sqrt(altimeter_variance[constants['altimeter_measurement_type']]),
                                          observed=data['altimeter_measurement'])
        
        # Pixel measurement error
        pixel_variance = pm.InverseGamma("pixel_variance", 
                                         alpha=constants['prior_pixel_variance'][0],
                                         beta=constants['prior_pixel_variance'][1])
        
        pixel_count_expected = (data['object_length'][constants['pixel_count_expected_object']] *
                                constants['image_focal_length'][constants['pixel_count_expected_image']] *
                                constants['image_width'][constants['pixel_count_expected_image']] /
                                constants['image_sensor_width'][constants['pixel_count_expected_image']] /
                                image_altitude[constants['pixel_count_expected_image']])
        
        pixel_count_observed = pm.Normal("pixel_count_observed",
                                         mu=pixel_count_expected,
                                         sigma=pm.math.sqrt(pixel_variance),
                                         observed=data['pixel_count_observed'])
        
        # Subject/Length Models
        if constants['n_basic_objects'] > 0:
            object_length = pm.Uniform("object_length", 
                                       lower=constants['prior_basic_object'][:, 0],
                                       upper=constants['prior_basic_object'][:, 1],
                                       shape=constants['n_basic_objects'])
        
        if constants['n_growth_curve_subjects'] > 0:
            zero_length_age = pm.Normal("zero_length_age", 
                                        mu=constants['prior_zero_length_age'][0], 
                                        sigma=constants['prior_zero_length_age'][1])
            
            growth_rate = pm.Normal("growth_rate", 
                                    mu=constants['prior_growth_rate'][0],
                                    sigma=constants['prior_growth_rate'][1])
            
            group_asymptotic_size = pm.Normal("group_asymptotic_size", 
                                              mu=constants['prior_group_asymptotic_size'][:, 0],
                                              sigma=constants['prior_group_asymptotic_size'][:, 1],
                                              shape=constants['n_groups'])
            
            group_asymptotic_size_trend = pm.Normal("group_asymptotic_size_trend", 
                                                    mu=constants['prior_group_asymptotic_size_trend'][:, 0],
                                                    sigma=constants['prior_group_asymptotic_size_trend'][:, 1],
                                                    shape=constants['n_groups'])
            
            subject_asymptotic_size = pm.Normal("subject_asymptotic_size", 
                                                mu=group_asymptotic_size[constants['subject_group']],
                                                sigma=constants['prior_asymptotic_size_sd'][1],
                                                shape=constants['n_growth_curve_subjects'])
            
            subject_birth_year = pm.Deterministic("subject_birth_year",
                                                  constants['subject_birth_year_minimum'] -
                                                  constants['subject_age_type'] * constants['subject_age_offset'])
            
            non_calf_length = pm.Deterministic("non_calf_length",
                                               subject_asymptotic_size * (1 - pm.math.exp(-growth_rate * (data['non_calf_length_age'] - zero_length_age))))
        
        return model
